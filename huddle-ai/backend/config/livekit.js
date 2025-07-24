const { RoomServiceClient, AccessToken } = require('livekit-server-sdk');

class LiveKitService {
    constructor() {
        this.apiKey = process.env.LIVEKIT_API_KEY;
        this.apiSecret = process.env.LIVEKIT_API_SECRET;
        this.livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';
        
        if (!this.apiKey || !this.apiSecret) {
            console.warn('LiveKit API credentials not configured');
            return;
        }
        
        this.roomService = new RoomServiceClient(this.livekitUrl, this.apiKey, this.apiSecret);
    }

    async createRoom(roomId, maxParticipants = 2) {
        try {
            const room = await this.roomService.createRoom({
                name: roomId,
                maxParticipants,
                emptyTimeout: 300, // 5 minutes
                departureTimeout: 20, // 20 seconds
            });
            
            console.log(`✅ Created LiveKit room: ${roomId}`);
            return room;
        } catch (error) {
            console.error('Error creating LiveKit room:', error);
            throw error;
        }
    }

    generateToken(roomId, participantId, participantName = '') {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('LiveKit credentials not configured');
        }

        const token = new AccessToken(this.apiKey, this.apiSecret, {
            identity: participantId,
            name: participantName,
        });

        token.addGrant({
            room: roomId,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
        });

        return token.toJwt();
    }

    async generateCoachToken(roomId, coachId, coachName) {
        const token = new AccessToken(this.apiKey, this.apiSecret, {
            identity: `coach-${coachId}`,
            name: coachName,
        });

        token.addGrant({
            room: roomId,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        return token.toJwt();
    }

    async listRooms() {
        try {
            const rooms = await this.roomService.listRooms();
            return rooms;
        } catch (error) {
            console.error('Error listing rooms:', error);
            return [];
        }
    }

    async deleteRoom(roomId) {
        try {
            await this.roomService.deleteRoom(roomId);
            console.log(`🗑️ Deleted LiveKit room: ${roomId}`);
        } catch (error) {
            console.error('Error deleting room:', error);
            throw error;
        }
    }

    async getParticipants(roomId) {
        try {
            const participants = await this.roomService.listParticipants(roomId);
            return participants;
        } catch (error) {
            console.error('Error getting participants:', error);
            return [];
        }
    }

    async removeParticipant(roomId, participantId) {
        try {
            await this.roomService.removeParticipant(roomId, participantId);
            console.log(`👤 Removed participant ${participantId} from room ${roomId}`);
        } catch (error) {
            console.error('Error removing participant:', error);
            throw error;
        }
    }

    generateRoomId(userId, coachId) {
        const timestamp = Date.now();
        return `meeting-${userId}-${coachId}-${timestamp}`;
    }

    isConfigured() {
        return !!(this.apiKey && this.apiSecret);
    }
}

module.exports = new LiveKitService();