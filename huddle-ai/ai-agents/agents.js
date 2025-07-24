require('dotenv').config();
const { createClient } = require('redis');
const { Room, RoomEvent, RemoteTrack, Track } = require('livekit-client');
const openaiService = require('./services/openaiService');
const geminiService = require('./services/geminiService');
const elevenlabsService = require('./services/elevenlabsService');

class AICoachAgent {
    constructor() {
        this.activeRooms = new Map();
        this.redisClient = null;
        this.init();
    }

    async init() {
        try {
            this.redisClient = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379'
            });

            this.redisClient.on('error', (err) => {
                console.error('Redis error:', err);
            });

            await this.redisClient.connect();
            console.log('AI Agent connected to Redis');

            await this.redisClient.subscribe('agent-notifications', (message) => {
                this.handleAgentNotification(JSON.parse(message));
            });

            console.log('AI Coach Agent service started');
        } catch (error) {
            console.error('Agent initialization error:', error);
            process.exit(1);
        }
    }

    async handleAgentNotification(notification) {
        const { type, roomId, coachId, coachData, agentToken, meetingId } = notification;

        if (type === 'start_agent') {
            console.log(`Starting agent for room ${roomId}`);
            await this.startAgentForRoom(roomId, coachData, agentToken, meetingId);
        }
    }

    async startAgentForRoom(roomId, coachData, agentToken, meetingId) {
        try {
            if (this.activeRooms.has(roomId)) {
                console.log(`Agent already active for room ${roomId}`);
                return;
            }

            const room = new Room();
            const agent = new CoachAgentInstance(roomId, coachData, meetingId, this.redisClient);

            room.on(RoomEvent.Connected, () => {
                console.log(`Agent connected to room ${roomId}`);
                agent.onConnected();
            });

            room.on(RoomEvent.Disconnected, () => {
                console.log(`Agent disconnected from room ${roomId}`);
                this.activeRooms.delete(roomId);
                agent.cleanup();
            });

            room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                if (track.kind === Track.Kind.Audio) {
                    agent.handleAudioTrack(track, participant);
                }
            });

            room.on(RoomEvent.DataReceived, (payload, participant) => {
                agent.handleDataMessage(payload, participant);
            });

            await room.connect(process.env.LIVEKIT_URL, agentToken);
            this.activeRooms.set(roomId, { room, agent });

        } catch (error) {
            console.error(`Error starting agent for room ${roomId}:`, error);
        }
    }

    async shutdown() {
        console.log('Shutting down AI Coach Agent service...');
        
        for (const [roomId, { room, agent }] of this.activeRooms) {
            try {
                agent.cleanup();
                await room.disconnect();
            } catch (error) {
                console.error(`Error disconnecting from room ${roomId}:`, error);
            }
        }

        if (this.redisClient) {
            await this.redisClient.disconnect();
        }

        process.exit(0);
    }
}

class CoachAgentInstance {
    constructor(roomId, coachData, meetingId, redisClient) {
        this.roomId = roomId;
        this.coachData = coachData;
        this.meetingId = meetingId;
        this.redisClient = redisClient;
        this.conversationHistory = [];
        this.isListening = false;
        this.audioBuffer = [];
    }

    async onConnected() {
        try {
            await this.redisClient.hSet(`agent:${this.roomId}`, {
                status: 'connected',
                connectedAt: new Date().toISOString()
            });

            await this.sendInitialGreeting();
        } catch (error) {
            console.error('Error in onConnected:', error);
        }
    }

    async sendInitialGreeting() {
        const greeting = this.generateGreeting();
        await this.speakMessage(greeting);
        this.conversationHistory.push({
            role: 'assistant',
            content: greeting,
            timestamp: new Date().toISOString()
        });
    }

    generateGreeting() {
        const coachName = this.coachData.name;
        const domain = this.coachData.expertise?.primaryDomain || 'coaching';
        
        const greetings = {
            interview: `Hello! I'm ${coachName}, your interview coach. I'm here to help you prepare for your upcoming interviews. Let's start by discussing the role you're interviewing for.`,
            sales: `Hi there! I'm ${coachName}, your sales training coach. I'm excited to help you improve your sales skills and close more deals. What specific area would you like to focus on today?`,
            language: `Hello! I'm ${coachName}, your language learning coach. I'm here to help you practice and improve your language skills in a supportive environment. What would you like to work on today?`,
            career: `Welcome! I'm ${coachName}, your career development coach. I'm here to help you navigate your professional journey and achieve your career goals. What challenges are you facing?`,
            presentation: `Hello! I'm ${coachName}, your presentation coach. I'm here to help you become a more confident and effective speaker. What presentation skills would you like to develop?`
        };

        return greetings[domain] || `Hello! I'm ${coachName}, your AI coach. I'm here to help you achieve your goals. How can I assist you today?`;
    }

    async handleAudioTrack(track, participant) {
        if (participant.identity.startsWith('user-')) {
            console.log(`Received audio track from ${participant.identity}`);
            this.setupAudioProcessing(track);
        }
    }

    setupAudioProcessing(track) {
        const audioElement = track.attach();
        
        if (navigator.mediaDevices && window.webkitSpeechRecognition) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                
                if (finalTranscript.trim()) {
                    this.handleUserMessage(finalTranscript.trim());
                }
            };

            recognition.start();
        }
    }

    async handleUserMessage(message) {
        try {
            console.log(`User message: ${message}`);
            
            this.conversationHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            });

            const response = await this.generateResponse(message);
            
            this.conversationHistory.push({
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            });

            await this.speakMessage(response);
            
            await this.saveConversationState();

        } catch (error) {
            console.error('Error handling user message:', error);
            const errorResponse = "I apologize, but I'm having trouble processing that. Could you please try again?";
            await this.speakMessage(errorResponse);
        }
    }

    async generateResponse(userMessage) {
        try {
            const systemPrompt = this.coachData.systemPrompts?.fullPrompt || this.buildDefaultPrompt();
            
            const messages = [
                { role: 'system', content: systemPrompt },
                ...this.conversationHistory.slice(-6),
                { role: 'user', content: userMessage }
            ];

            if (process.env.GEMINI_API_KEY) {
                return await geminiService.generateResponse(messages);
            } else {
                return await openaiService.generateResponse(messages);
            }
        } catch (error) {
            console.error('Error generating AI response:', error);
            return "I'm sorry, I'm having trouble generating a response right now. Let's try a different approach.";
        }
    }

    buildDefaultPrompt() {
        const { name, personality, expertise } = this.coachData;
        
        return `You are ${name}, an AI coach specializing in ${expertise?.primaryDomain || 'general coaching'}.

Your personality traits:
- Communication style: ${personality?.communicationStyle || 'supportive'}
- Approach: ${personality?.approachMethod || 'balanced'}
- Empathy level: ${personality?.traits?.empathy || 7}/10
- Directness: ${personality?.traits?.directness || 6}/10

Guidelines:
1. Provide helpful, actionable coaching advice
2. Ask thoughtful follow-up questions
3. Maintain your personality throughout the conversation
4. Keep responses conversational and engaging
5. Focus on helping the user achieve their goals

Remember to stay in character and provide value in every interaction.`;
    }

    async speakMessage(message) {
        try {
            if (process.env.ELEVENLABS_API_KEY && this.coachData.voice?.voiceId) {
                const audioBuffer = await elevenlabsService.generateSpeech(
                    message,
                    this.coachData.voice.voiceId,
                    {
                        stability: this.coachData.voice.stability || 0.5,
                        clarity: this.coachData.voice.clarity || 0.8
                    }
                );

                await this.publishAudio(audioBuffer);
            } else {
                console.log(`Coach response: ${message}`);
                await this.sendTextMessage(message);
            }
        } catch (error) {
            console.error('Error speaking message:', error);
            await this.sendTextMessage(message);
        }
    }

    async publishAudio(audioBuffer) {
        try {
            const audioTrack = new LocalAudioTrack(audioBuffer);
            await this.room.localParticipant.publishTrack(audioTrack);
        } catch (error) {
            console.error('Error publishing audio:', error);
        }
    }

    async sendTextMessage(message) {
        try {
            const data = JSON.stringify({
                type: 'coach_message',
                message: message,
                timestamp: new Date().toISOString()
            });

            await this.room.localParticipant.publishData(
                new TextEncoder().encode(data),
                'reliable'
            );
        } catch (error) {
            console.error('Error sending text message:', error);
        }
    }

    async handleDataMessage(payload, participant) {
        try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            
            if (data.type === 'user_message') {
                await this.handleUserMessage(data.message);
            } else if (data.type === 'meeting_end') {
                await this.handleMeetingEnd();
            }
        } catch (error) {
            console.error('Error handling data message:', error);
        }
    }

    async handleMeetingEnd() {
        const summary = this.generateSessionSummary();
        
        await this.redisClient.hSet(`session:${this.meetingId}`, {
            summary: JSON.stringify(summary),
            conversationHistory: JSON.stringify(this.conversationHistory),
            endedAt: new Date().toISOString()
        });

        const farewell = "Thank you for the session! I hope our conversation was helpful. Have a great day!";
        await this.speakMessage(farewell);
    }

    generateSessionSummary() {
        const totalMessages = this.conversationHistory.length;
        const userMessages = this.conversationHistory.filter(m => m.role === 'user').length;
        const duration = this.conversationHistory.length > 0 ? 
            new Date() - new Date(this.conversationHistory[0].timestamp) : 0;

        return {
            totalMessages,
            userMessages,
            duration: Math.round(duration / 1000),
            topics: this.extractTopics(),
            keyInsights: this.extractKeyInsights()
        };
    }

    extractTopics() {
        const messages = this.conversationHistory
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .join(' ');

        const commonWords = messages
            .toLowerCase()
            .split(/\W+/)
            .filter(word => word.length > 4)
            .slice(0, 10);

        return [...new Set(commonWords)];
    }

    extractKeyInsights() {
        const insights = [];
        const userMessages = this.conversationHistory.filter(m => m.role === 'user');
        
        if (userMessages.length > 3) {
            insights.push('Engaged in meaningful conversation');
        }
        
        if (this.conversationHistory.length > 10) {
            insights.push('Extended coaching session');
        }

        return insights;
    }

    async saveConversationState() {
        try {
            await this.redisClient.hSet(`conversation:${this.roomId}`, {
                history: JSON.stringify(this.conversationHistory.slice(-20)),
                lastUpdate: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error saving conversation state:', error);
        }
    }

    async cleanup() {
        try {
            await this.redisClient.del(`agent:${this.roomId}`);
            await this.redisClient.del(`conversation:${this.roomId}`);
            console.log(`Cleaned up agent for room ${this.roomId}`);
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

const agent = new AICoachAgent();

process.on('SIGINT', () => agent.shutdown());
process.on('SIGTERM', () => agent.shutdown());