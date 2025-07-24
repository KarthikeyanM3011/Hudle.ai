// LiveKit Client Integration for Huddle.ai

class LiveKitClient {
    constructor(options = {}) {
        this.room = null;
        this.localParticipant = null;
        this.isConnected = false;
        this.isAudioEnabled = true;
        this.isVideoEnabled = false;
        this.options = options;
        this.audioContext = null;
        this.mediaStream = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.callbacks = {
            onConnected: options.onConnected || (() => {}),
            onDisconnected: options.onDisconnected || (() => {}),
            onParticipantConnected: options.onParticipantConnected || (() => {}),
            onParticipantDisconnected: options.onParticipantDisconnected || (() => {}),
            onTrackSubscribed: options.onTrackSubscribed || (() => {}),
            onTrackUnsubscribed: options.onTrackUnsubscribed || (() => {}),
            onDataReceived: options.onDataReceived || (() => {}),
            onSpeaking: options.onSpeaking || (() => {}),
            onError: options.onError || (() => {})
        };
    }

    async connect(url, token, options = {}) {
        try {
            // Import LiveKit dynamically
            if (typeof LiveKit === 'undefined') {
                await this.loadLiveKitSDK();
            }

            this.room = new LiveKit.Room({
                adaptiveStream: true,
                dynacast: true,
                videoCaptureDefaults: {
                    resolution: LiveKit.VideoPresets.h720.resolution,
                },
                publishDefaults: {
                    videoSimulcastLayers: [LiveKit.VideoPresets.h180, LiveKit.VideoPresets.h360],
                },
                ...options
            });

            this.setupRoomEventListeners();

            await this.room.connect(url, token);
            this.isConnected = true;
            this.localParticipant = this.room.localParticipant;

            // Initialize audio/video based on options
            if (this.options.enableAudio !== false) {
                await this.enableMicrophone();
            }

            if (this.options.enableVideo) {
                await this.enableCamera();
            }

            this.callbacks.onConnected(this.room);
            this.updateConnectionStatus('connected');
            
            console.log('Connected to LiveKit room successfully');
            return this.room;

        } catch (error) {
            console.error('Failed to connect to LiveKit room:', error);
            this.callbacks.onError('Connection failed', error);
            this.updateConnectionStatus('failed');
            throw error;
        }
    }

    async loadLiveKitSDK() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/livekit-client/dist/livekit-client.umd.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupRoomEventListeners() {
        this.room.on(LiveKit.RoomEvent.Connected, () => {
            console.log('Room connected');
            this.reconnectAttempts = 0;
        });

        this.room.on(LiveKit.RoomEvent.Disconnected, (reason) => {
            console.log('Room disconnected:', reason);
            this.isConnected = false;
            this.callbacks.onDisconnected(reason);
            this.updateConnectionStatus('disconnected');
            
            if (reason !== LiveKit.DisconnectReason.CLIENT_INITIATED) {
                this.attemptReconnect();
            }
        });

        this.room.on(LiveKit.RoomEvent.ParticipantConnected, (participant) => {
            console.log('Participant connected:', participant.identity);
            this.callbacks.onParticipantConnected(participant);
            this.setupParticipantEventListeners(participant);
        });

        this.room.on(LiveKit.RoomEvent.ParticipantDisconnected, (participant) => {
            console.log('Participant disconnected:', participant.identity);
            this.callbacks.onParticipantDisconnected(participant);
        });

        this.room.on(LiveKit.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            console.log('Track subscribed:', track.kind, participant.identity);
            this.handleTrackSubscribed(track, publication, participant);
        });

        this.room.on(LiveKit.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
            console.log('Track unsubscribed:', track.kind, participant.identity);
            this.callbacks.onTrackUnsubscribed(track, publication, participant);
        });

        this.room.on(LiveKit.RoomEvent.DataReceived, (payload, participant) => {
            try {
                const data = JSON.parse(new TextDecoder().decode(payload));
                this.callbacks.onDataReceived(data, participant);
            } catch (error) {
                console.error('Failed to parse data message:', error);
            }
        });

        this.room.on(LiveKit.RoomEvent.ConnectionQualityChanged, (quality, participant) => {
            this.updateConnectionQuality(quality, participant);
        });

        this.room.on(LiveKit.RoomEvent.Reconnecting, () => {
            console.log('Reconnecting...');
            this.updateConnectionStatus('reconnecting');
        });

        this.room.on(LiveKit.RoomEvent.Reconnected, () => {
            console.log('Reconnected successfully');
            this.updateConnectionStatus('connected');
        });
    }

    setupParticipantEventListeners(participant) {
        participant.on(LiveKit.ParticipantEvent.IsSpeakingChanged, (speaking) => {
            this.callbacks.onSpeaking(participant, speaking);
            this.updateSpeakingIndicator(participant, speaking);
        });

        participant.on(LiveKit.ParticipantEvent.TrackMuted, (publication) => {
            console.log(`Track muted: ${publication.kind} by ${participant.identity}`);
        });

        participant.on(LiveKit.ParticipantEvent.TrackUnmuted, (publication) => {
            console.log(`Track unmuted: ${publication.kind} by ${participant.identity}`);
        });
    }

    handleTrackSubscribed(track, publication, participant) {
        if (track.kind === LiveKit.Track.Kind.Audio) {
            this.handleAudioTrack(track, participant);
        } else if (track.kind === LiveKit.Track.Kind.Video) {
            this.handleVideoTrack(track, participant);
        }
        
        this.callbacks.onTrackSubscribed(track, publication, participant);
    }

    handleAudioTrack(track, participant) {
        const audioElement = track.attach();
        audioElement.volume = this.getParticipantVolume(participant);
        
        // Add to audio container or handle separately for AI coach
        if (participant.identity.startsWith('coach-')) {
            this.handleCoachAudio(audioElement, participant);
        } else {
            this.handleUserAudio(audioElement, participant);
        }
    }

    handleVideoTrack(track, participant) {
        const videoElement = track.attach();
        videoElement.classList.add('participant-video');
        
        if (participant.identity.startsWith('coach-')) {
            this.handleCoachVideo(videoElement, participant);
        } else {
            this.handleUserVideo(videoElement, participant);
        }
    }

    handleCoachAudio(audioElement, participant) {
        // Coach audio handling
        document.body.appendChild(audioElement);
        
        // Show speaking animation when coach is talking
        audioElement.addEventListener('play', () => {
            this.showCoachSpeaking(true);
        });
        
        audioElement.addEventListener('pause', () => {
            this.showCoachSpeaking(false);
        });
    }

    handleCoachVideo(videoElement, participant) {
        const coachVideoContainer = document.getElementById('coachVideoContainer');
        if (coachVideoContainer) {
            coachVideoContainer.innerHTML = '';
            coachVideoContainer.appendChild(videoElement);
        }
    }

    handleUserAudio(audioElement, participant) {
        // Typically muted for local echo prevention
        audioElement.muted = participant === this.room.localParticipant;
        document.body.appendChild(audioElement);
    }

    handleUserVideo(videoElement, participant) {
        if (participant === this.room.localParticipant) {
            // Local video
            const localVideoContainer = document.getElementById('localVideo');
            if (localVideoContainer) {
                localVideoContainer.innerHTML = '';
                localVideoContainer.appendChild(videoElement);
            }
        } else {
            // Remote user video
            const remoteVideoContainer = document.getElementById('remoteVideo');
            if (remoteVideoContainer) {
                remoteVideoContainer.innerHTML = '';
                remoteVideoContainer.appendChild(videoElement);
            }
        }
    }

    async enableMicrophone() {
        try {
            if (!this.localParticipant) {
                throw new Error('Not connected to room');
            }

            await this.localParticipant.setMicrophoneEnabled(true);
            this.isAudioEnabled = true;
            this.updateMicrophoneButton(true);
            
            console.log('Microphone enabled');
            return true;
        } catch (error) {
            console.error('Failed to enable microphone:', error);
            this.callbacks.onError('Microphone access failed', error);
            return false;
        }
    }

    async disableMicrophone() {
        try {
            if (!this.localParticipant) return;

            await this.localParticipant.setMicrophoneEnabled(false);
            this.isAudioEnabled = false;
            this.updateMicrophoneButton(false);
            
            console.log('Microphone disabled');
        } catch (error) {
            console.error('Failed to disable microphone:', error);
        }
    }

    async toggleMicrophone() {
        if (this.isAudioEnabled) {
            await this.disableMicrophone();
        } else {
            await this.enableMicrophone();
        }
        return this.isAudioEnabled;
    }

    async enableCamera() {
        try {
            if (!this.localParticipant) {
                throw new Error('Not connected to room');
            }

            await this.localParticipant.setCameraEnabled(true);
            this.isVideoEnabled = true;
            this.updateCameraButton(true);
            
            console.log('Camera enabled');
            return true;
        } catch (error) {
            console.error('Failed to enable camera:', error);
            this.callbacks.onError('Camera access failed', error);
            return false;
        }
    }

    async disableCamera() {
        try {
            if (!this.localParticipant) return;

            await this.localParticipant.setCameraEnabled(false);
            this.isVideoEnabled = false;
            this.updateCameraButton(false);
            
            console.log('Camera disabled');
        } catch (error) {
            console.error('Failed to disable camera:', error);
        }
    }

    async toggleCamera() {
        if (this.isVideoEnabled) {
            await this.disableCamera();
        } else {
            await this.enableCamera();
        }
        return this.isVideoEnabled;
    }

    async sendDataMessage(data, destination = []) {
        try {
            if (!this.localParticipant) {
                throw new Error('Not connected to room');
            }

            const encoder = new TextEncoder();
            const payload = encoder.encode(JSON.stringify(data));
            
            await this.localParticipant.publishData(payload, LiveKit.DataPacket_Kind.RELIABLE, destination);
            
            console.log('Data message sent:', data);
        } catch (error) {
            console.error('Failed to send data message:', error);
            throw error;
        }
    }

    async sendChatMessage(message) {
        await this.sendDataMessage({
            type: 'chat',
            message: message,
            timestamp: Date.now(),
            sender: this.localParticipant.identity
        });
    }

    getParticipantVolume(participant) {
        // Get volume setting for specific participant
        const volumeControl = document.getElementById('volumeControl');
        return volumeControl ? volumeControl.value / 100 : 0.75;
    }

    setParticipantVolume(participant, volume) {
        // Set volume for specific participant's audio tracks
        participant.audioTracks.forEach(track => {
            if (track.track) {
                const audioElement = track.track.mediaStreamTrack;
                if (audioElement) {
                    audioElement.volume = volume;
                }
            }
        });
    }

    async switchAudioDevice(deviceId) {
        try {
            await this.localParticipant.switchActiveDevice('audioinput', deviceId);
            console.log('Switched to audio device:', deviceId);
        } catch (error) {
            console.error('Failed to switch audio device:', error);
        }
    }

    async switchVideoDevice(deviceId) {
        try {
            await this.localParticipant.switchActiveDevice('videoinput', deviceId);
            console.log('Switched to video device:', deviceId);
        } catch (error) {
            console.error('Failed to switch video device:', error);
        }
    }

    async getDevices() {
        try {
            const devices = await LiveKit.Room.getLocalDevices();
            return {
                audioInputs: devices.filter(d => d.kind === 'audioinput'),
                audioOutputs: devices.filter(d => d.kind === 'audiooutput'),
                videoInputs: devices.filter(d => d.kind === 'videoinput')
            };
        } catch (error) {
            console.error('Failed to get devices:', error);
            return { audioInputs: [], audioOutputs: [], videoInputs: [] };
        }
    }

    async attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.callbacks.onError('Connection lost', new Error('Max reconnection attempts reached'));
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
        
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
        
        setTimeout(async () => {
            try {
                if (this.room && this.room.state === LiveKit.ConnectionState.Disconnected) {
                    await this.room.connect(this.options.url, this.options.token);
                }
            } catch (error) {
                console.error('Reconnection attempt failed:', error);
                this.attemptReconnect();
            }
        }, delay);
    }

    async disconnect() {
        try {
            if (this.room) {
                await this.room.disconnect();
                this.room = null;
            }
            
            this.isConnected = false;
            this.localParticipant = null;
            
            console.log('Disconnected from room');
        } catch (error) {
            console.error('Error during disconnect:', error);
        }
    }

    // UI Update Methods
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            const statusIcon = statusElement.querySelector('i');
            const statusText = statusElement.querySelector('small');
            
            switch (status) {
                case 'connected':
                    statusIcon.className = 'fas fa-circle text-success me-1';
                    statusText.textContent = 'Connected';
                    break;
                case 'connecting':
                    statusIcon.className = 'fas fa-circle text-warning me-1';
                    statusText.textContent = 'Connecting...';
                    break;
                case 'reconnecting':
                    statusIcon.className = 'fas fa-circle text-warning me-1';
                    statusText.textContent = 'Reconnecting...';
                    break;
                case 'disconnected':
                    statusIcon.className = 'fas fa-circle text-danger me-1';
                    statusText.textContent = 'Disconnected';
                    break;
                case 'failed':
                    statusIcon.className = 'fas fa-circle text-danger me-1';
                    statusText.textContent = 'Connection Failed';
                    break;
            }
        }
    }

    updateMicrophoneButton(enabled) {
        const micButton = document.getElementById('toggleMic');
        const micIcon = document.getElementById('micIcon');
        
        if (micButton && micIcon) {
            micButton.classList.toggle('btn-outline-light', enabled);
            micButton.classList.toggle('btn-danger', !enabled);
            micIcon.className = enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
        }
    }

    updateCameraButton(enabled) {
        const videoButton = document.getElementById('toggleVideo');
        const videoIcon = document.getElementById('videoIcon');
        
        if (videoButton && videoIcon) {
            videoButton.classList.toggle('btn-outline-light', enabled);
            videoButton.classList.toggle('btn-danger', !enabled);
            videoIcon.className = enabled ? 'fas fa-video' : 'fas fa-video-slash';
        }
    }

    updateSpeakingIndicator(participant, speaking) {
        const indicator = document.getElementById('speakingIndicator');
        if (indicator && participant.identity.startsWith('coach-')) {
            indicator.classList.toggle('active', speaking);
        }
    }

    showCoachSpeaking(speaking) {
        const avatar = document.getElementById('coachAvatar');
        const speakingIndicator = document.getElementById('speakingIndicator');
        
        if (avatar) {
            avatar.classList.toggle('speaking', speaking);
        }
        
        if (speakingIndicator) {
            speakingIndicator.classList.toggle('active', speaking);
        }
    }

    updateConnectionQuality(quality, participant) {
        console.log(`Connection quality for ${participant.identity}: ${quality}`);
        
        // Update UI based on connection quality
        const qualityIndicator = document.getElementById('qualityIndicator');
        if (qualityIndicator) {
            qualityIndicator.className = `quality-${quality.toLowerCase()}`;
        }
    }

    // Recording Methods
    async startRecording() {
        try {
            if (!this.room) throw new Error('Not connected to room');
            
            await this.sendDataMessage({
                type: 'start_recording',
                timestamp: Date.now()
            });
            
            console.log('Recording started');
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    }

    async stopRecording() {
        try {
            if (!this.room) throw new Error('Not connected to room');
            
            await this.sendDataMessage({
                type: 'stop_recording',
                timestamp: Date.now()
            });
            
            console.log('Recording stopped');
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    }
}

// Export for global use
window.LiveKitClient = LiveKitClient;