const { RoomServiceClient, WebhookReceiver } = require('livekit-server-sdk');
const { redisClient } = require('../config/redis');
const { spawn } = require('child_process');
const path = require('path');

class LiveKitService {
    constructor() {
        this.roomService = new RoomServiceClient(
            process.env.LIVEKIT_URL || 'ws://localhost:7880',
            process.env.LIVEKIT_API_KEY || 'devkey',
            process.env.LIVEKIT_API_SECRET || 'secret'
        );
        this.webhookReceiver = new WebhookReceiver(
            process.env.LIVEKIT_API_KEY || 'devkey',
            process.env.LIVEKIT_API_SECRET || 'secret'
        );
        this.activeAgents = new Map();
    }

    async notifyAgent(agentData) {
        try {
            const { roomId, coachId, coachData, agentToken, meetingId } = agentData;
            
            await redisClient.hSet(`agent:${roomId}`, {
                coachId: coachId.toString(),
                coachData: JSON.stringify(coachData),
                agentToken,
                meetingId: meetingId.toString(),
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            await redisClient.publish('agent-notifications', JSON.stringify({
                type: 'start_agent',
                roomId,
                coachId,
                coachData,
                agentToken,
                meetingId
            }));

            console.log(`Agent notification sent for room ${roomId}`);
            return true;
        } catch (error) {
            console.error('Error notifying agent:', error);
            throw error;
        }
    }

    async getActiveRooms() {
        try {
            const rooms = await this.roomService.listRooms();
            return rooms.map(room => ({
                name: room.name,
                numParticipants: room.numParticipants,
                creationTime: room.creationTime,
                metadata: room.metadata ? JSON.parse(room.metadata) : {}
            }));
        } catch (error) {
            console.error('Error fetching active rooms:', error);
            return [];
        }
    }

    async getRoomParticipants(roomName) {
        try {
            const participants = await this.roomService.listParticipants(roomName);
            return participants.map(p => ({
                identity: p.identity,
                name: p.name,
                state: p.state,
                tracks: p.tracks.map(track => ({
                    sid: track.sid,
                    type: track.type,
                    source: track.source
                }))
            }));
        } catch (error) {
            console.error('Error fetching room participants:', error);
            return [];
        }
    }

    async removeParticipant(roomName, identity) {
        try {
            await this.roomService.removeParticipant(roomName, identity);
            console.log(`Removed participant ${identity} from room ${roomName}`);
            return true;
        } catch (error) {
            console.error('Error removing participant:', error);
            return false;
        }
    }

    async muteParticipant(roomName, identity, trackSid) {
        try {
            await this.roomService.mutePublishedTrack(roomName, identity, trackSid, true);
            console.log(`Muted track ${trackSid} for participant ${identity}`);
            return true;
        } catch (error) {
            console.error('Error muting participant:', error);
            return false;
        }
    }

    async sendDataMessage(roomName, data, destinationSids = []) {
        try {
            await this.roomService.sendData(roomName, data, 'reliable', destinationSids);
            return true;
        } catch (error) {
            console.error('Error sending data message:', error);
            return false;
        }
    }

    async updateRoomMetadata(roomName, metadata) {
        try {
            await this.roomService.updateRoomMetadata(roomName, JSON.stringify(metadata));
            return true;
        } catch (error) {
            console.error('Error updating room metadata:', error);
            return false;
        }
    }

    async handleWebhook(body, authHeader) {
        try {
            const event = this.webhookReceiver.receive(body, authHeader);
            
            switch (event.event) {
                case 'room_started':
                    await this.handleRoomStarted(event);
                    break;
                case 'room_finished':
                    await this.handleRoomFinished(event);
                    break;
                case 'participant_joined':
                    await this.handleParticipantJoined(event);
                    break;
                case 'participant_left':
                    await this.handleParticipantLeft(event);
                    break;
                case 'track_published':
                    await this.handleTrackPublished(event);
                    break;
                case 'track_unpublished':
                    await this.handleTrackUnpublished(event);
                    break;
                default:
                    console.log(`Unhandled webhook event: ${event.event}`);
            }

            return { success: true };
        } catch (error) {
            console.error('Webhook handling error:', error);
            return { success: false, error: error.message };
        }
    }

    async handleRoomStarted(event) {
        const { room } = event;
        console.log(`Room started: ${room.name}`);
        
        await redisClient.hSet(`room:${room.name}`, {
            status: 'active',
            startedAt: new Date().toISOString(),
            numParticipants: room.numParticipants
        });
    }

    async handleRoomFinished(event) {
        const { room } = event;
        console.log(`Room finished: ${room.name}`);
        
        await redisClient.hSet(`room:${room.name}`, {
            status: 'finished',
            finishedAt: new Date().toISOString()
        });

        await this.cleanupAgentForRoom(room.name);
    }

    async handleParticipantJoined(event) {
        const { room, participant } = event;
        console.log(`Participant joined: ${participant.identity} in room ${room.name}`);
        
        if (participant.identity.startsWith('coach-')) {
            await redisClient.hSet(`agent:${room.name}`, {
                status: 'active',
                joinedAt: new Date().toISOString()
            });
        }
    }

    async handleParticipantLeft(event) {
        const { room, participant } = event;
        console.log(`Participant left: ${participant.identity} from room ${room.name}`);
        
        if (participant.identity.startsWith('coach-')) {
            await this.cleanupAgentForRoom(room.name);
        }
    }

    async handleTrackPublished(event) {
        const { room, participant, track } = event;
        console.log(`Track published: ${track.type} by ${participant.identity} in room ${room.name}`);
    }

    async handleTrackUnpublished(event) {
        const { room, participant, track } = event;
        console.log(`Track unpublished: ${track.type} by ${participant.identity} in room ${room.name}`);
    }

    async cleanupAgentForRoom(roomName) {
        try {
            await redisClient.del(`agent:${roomName}`);
            await redisClient.del(`room:${roomName}`);
            
            if (this.activeAgents.has(roomName)) {
                const agentProcess = this.activeAgents.get(roomName);
                if (agentProcess && !agentProcess.killed) {
                    agentProcess.kill('SIGTERM');
                }
                this.activeAgents.delete(roomName);
            }
            
            console.log(`Cleaned up agent resources for room ${roomName}`);
        } catch (error) {
            console.error('Error cleaning up agent:', error);
        }
    }

    async getAgentStatus(roomId) {
        try {
            const agentData = await redisClient.hGetAll(`agent:${roomId}`);
            return agentData || null;
        } catch (error) {
            console.error('Error getting agent status:', error);
            return null;
        }
    }

    async updateAgentStatus(roomId, status, additional = {}) {
        try {
            await redisClient.hSet(`agent:${roomId}`, {
                status,
                updatedAt: new Date().toISOString(),
                ...additional
            });
        } catch (error) {
            console.error('Error updating agent status:', error);
        }
    }

    async recordRoom(roomName, outputPath) {
        try {
            const recordingOptions = {
                room_name: roomName,
                template: {
                    layout: 'speaker',
                    base_url: process.env.FRONTEND_URL || 'http://localhost:3000'
                },
                file_outputs: [{
                    file_type: 'MP4',
                    filepath: outputPath
                }]
            };

            const egressInfo = await this.roomService.startRoomCompositeEgress(
                roomName,
                recordingOptions
            );

            return {
                egressId: egressInfo.egressId,
                status: egressInfo.status,
                outputPath
            };
        } catch (error) {
            console.error('Error starting room recording:', error);
            throw error;
        }
    }

    async stopRecording(egressId) {
        try {
            const egressInfo = await this.roomService.stopEgress(egressId);
            return {
                status: egressInfo.status,
                endedAt: egressInfo.endedAt
            };
        } catch (error) {
            console.error('Error stopping recording:', error);
            throw error;
        }
    }

    async getRoomStats() {
        try {
            const rooms = await this.getActiveRooms();
            const totalRooms = rooms.length;
            const totalParticipants = rooms.reduce((sum, room) => sum + room.numParticipants, 0);
            
            const agentKeys = await redisClient.keys('agent:*');
            const activeAgents = agentKeys.length;

            return {
                totalRooms,
                totalParticipants,
                activeAgents,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting room stats:', error);
            return {
                totalRooms: 0,
                totalParticipants: 0,
                activeAgents: 0,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = new LiveKitService();