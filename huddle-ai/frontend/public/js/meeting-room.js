// Meeting Room JavaScript for Huddle.ai

class MeetingRoom {
    constructor(config) {
        this.config = config;
        this.livekitClient = null;
        this.isInitialized = false;
        this.sessionStartTime = null;
        this.sessionTimer = null;
        this.chatMessages = [];
        this.isRecording = false;
        this.settings = {
            audioVolume: 75,
            microphoneEnabled: true,
            cameraEnabled: false,
            autoTranscribe: true
        };
        
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.initializeTimer();
            this.initializeChat();
            this.loadSettings();
            await this.initializeLiveKit();
            this.isInitialized = true;
            
            console.log('Meeting room initialized successfully');
        } catch (error) {
            console.error('Failed to initialize meeting room:', error);
            this.showError('Failed to initialize meeting room');
        }
    }

    setupEventListeners() {
        // Control buttons
        document.getElementById('toggleMic')?.addEventListener('click', () => this.toggleMicrophone());
        document.getElementById('toggleVideo')?.addEventListener('click', () => this.toggleCamera());
        document.getElementById('leaveButton')?.addEventListener('click', () => this.showEndSessionModal());
        document.getElementById('endMeetingButton')?.addEventListener('click', () => this.showEndSessionModal());
        document.getElementById('muteButton')?.addEventListener('click', () => this.toggleMute());
        document.getElementById('recordButton')?.addEventListener('click', () => this.toggleRecording());
        document.getElementById('settingsButton')?.addEventListener('click', () => this.showSettings());

        // Volume control
        document.getElementById('volumeControl')?.addEventListener('input', (e) => {
            this.updateVolume(e.target.value);
        });

        // Chat
        document.getElementById('chatForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendChatMessage();
        });

        document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });

        // Settings modal
        document.getElementById('settingsModal')?.addEventListener('shown.bs.modal', () => {
            this.loadDeviceOptions();
        });

        // Prevent accidental page unload
        window.addEventListener('beforeunload', (e) => {
            if (this.isInitialized) {
                e.preventDefault();
                e.returnValue = 'Are you sure you want to leave the meeting?';
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        });
    }

    async initializeLiveKit() {
        const livekitOptions = {
            enableAudio: true,
            enableVideo: this.config.mediaSettings?.userVideo || false,
            onConnected: (room) => this.onLiveKitConnected(room),
            onDisconnected: (reason) => this.onLiveKitDisconnected(reason),
            onParticipantConnected: (participant) => this.onParticipantConnected(participant),
            onParticipantDisconnected: (participant) => this.onParticipantDisconnected(participant),
            onTrackSubscribed: (track, publication, participant) => this.onTrackSubscribed(track, publication, participant),
            onDataReceived: (data, participant) => this.onDataReceived(data, participant),
            onSpeaking: (participant, speaking) => this.onSpeaking(participant, speaking),
            onError: (message, error) => this.onLiveKitError(message, error)
        };

        this.livekitClient = new LiveKitClient(livekitOptions);
        
        await this.livekitClient.connect(
            this.config.joinData.joinUrl || 'ws://localhost:7880',
            this.config.joinData.token
        );
    }

    onLiveKitConnected(room) {
        console.log('Connected to LiveKit room:', room.name);
        this.sessionStartTime = new Date();
        this.startSessionTimer();
        this.updateConnectionStatus('connected');
        
        // Send initial greeting to coach
        setTimeout(() => {
            this.sendCoachMessage({
                type: 'session_start',
                timestamp: this.sessionStartTime.toISOString(),
                meetingId: this.config.meetingId
            });
        }, 1000);
    }

    onLiveKitDisconnected(reason) {
        console.log('Disconnected from LiveKit room:', reason);
        this.updateConnectionStatus('disconnected');
        
        if (reason !== 'CLIENT_INITIATED') {
            this.showError('Connection lost. Attempting to reconnect...');
        }
    }

    onParticipantConnected(participant) {
        console.log('Participant connected:', participant.identity);
        
        if (participant.identity.startsWith('coach-')) {
            this.onCoachConnected(participant);
        }
    }

    onParticipantDisconnected(participant) {
        console.log('Participant disconnected:', participant.identity);
        
        if (participant.identity.startsWith('coach-')) {
            this.onCoachDisconnected(participant);
        }
    }

    onCoachConnected(participant) {
        this.showCoachStatus('Your AI coach has joined the session');
        
        // Update coach display
        const coachStatus = document.querySelector('.coach-status');
        if (coachStatus) {
            coachStatus.textContent = 'Active';
            coachStatus.className = 'coach-status text-success';
        }
    }

    onCoachDisconnected(participant) {
        this.showCoachStatus('Your AI coach has left the session');
        
        const coachStatus = document.querySelector('.coach-status');
        if (coachStatus) {
            coachStatus.textContent = 'Disconnected';
            coachStatus.className = 'coach-status text-danger';
        }
    }

    onTrackSubscribed(track, publication, participant) {
        console.log('Track subscribed:', track.kind, 'from', participant.identity);
        
        if (participant.identity.startsWith('coach-') && track.kind === 'audio') {
            this.handleCoachAudio(track);
        }
    }

    handleCoachAudio(track) {
        const audioElement = track.attach();
        audioElement.volume = this.settings.audioVolume / 100;
        document.body.appendChild(audioElement);
        
        // Show speaking indicator when audio plays
        track.on('speaking', (speaking) => {
            this.updateCoachSpeaking(speaking);
        });
    }

    onDataReceived(data, participant) {
        console.log('Data received:', data, 'from', participant.identity);
        
        switch (data.type) {
            case 'coach_message':
                this.handleCoachMessage(data);
                break;
            case 'chat_message':
                this.addChatMessage(data.message, participant.identity);
                break;
            case 'session_update':
                this.handleSessionUpdate(data);
                break;
            case 'transcription':
                this.handleTranscription(data);
                break;
        }
    }

    onSpeaking(participant, speaking) {
        if (participant.identity.startsWith('coach-')) {
            this.updateCoachSpeaking(speaking);
        }
    }

    onLiveKitError(message, error) {
        console.error('LiveKit error:', message, error);
        this.showError(`Connection error: ${message}`);
    }

    handleCoachMessage(data) {
        if (data.message) {
            this.addChatMessage(data.message, 'coach', data.timestamp);
        }
    }

    handleSessionUpdate(data) {
        // Handle session updates from coach
        if (data.suggestions) {
            this.showCoachSuggestions(data.suggestions);
        }
    }

    handleTranscription(data) {
        if (data.text && this.settings.autoTranscribe) {
            this.displayTranscription(data.text, data.speaker);
        }
    }

    async toggleMicrophone() {
        try {
            const enabled = await this.livekitClient.toggleMicrophone();
            this.settings.microphoneEnabled = enabled;
            this.updateMicrophoneUI(enabled);
            
            this.showInfo(enabled ? 'Microphone enabled' : 'Microphone disabled');
        } catch (error) {
            this.showError('Failed to toggle microphone');
        }
    }

    async toggleCamera() {
        try {
            const enabled = await this.livekitClient.toggleCamera();
            this.settings.cameraEnabled = enabled;
            this.updateCameraUI(enabled);
            
            this.showInfo(enabled ? 'Camera enabled' : 'Camera disabled');
        } catch (error) {
            this.showError('Failed to toggle camera');
        }
    }

    toggleMute() {
        this.settings.audioVolume = this.settings.audioVolume > 0 ? 0 : 75;
        this.updateVolume(this.settings.audioVolume);
        
        const volumeControl = document.getElementById('volumeControl');
        if (volumeControl) {
            volumeControl.value = this.settings.audioVolume;
        }
    }

    async toggleRecording() {
        try {
            if (this.isRecording) {
                await this.stopRecording();
            } else {
                await this.startRecording();
            }
        } catch (error) {
            this.showError('Failed to toggle recording');
        }
    }

    async startRecording() {
        try {
            await this.livekitClient.startRecording();
            this.isRecording = true;
            this.updateRecordingUI(true);
            this.showSuccess('Recording started');
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw error;
        }
    }

    async stopRecording() {
        try {
            await this.livekitClient.stopRecording();
            this.isRecording = false;
            this.updateRecordingUI(false);
            this.showInfo('Recording stopped');
        } catch (error) {
            console.error('Failed to stop recording:', error);
            throw error;
        }
    }

    updateVolume(volume) {
        this.settings.audioVolume = parseInt(volume);
        
        // Update volume for all coach audio tracks
        if (this.livekitClient && this.livekitClient.room) {
            this.livekitClient.room.participants.forEach(participant => {
                if (participant.identity.startsWith('coach-')) {
                    this.livekitClient.setParticipantVolume(participant, volume / 100);
                }
            });
        }
        
        this.updateVolumeIcon(volume);
    }

    updateVolumeIcon(volume) {
        const volumeIcon = document.querySelector('.volume-control i');
        if (volumeIcon) {
            if (volume == 0) {
                volumeIcon.className = 'fas fa-volume-mute me-2';
            } else if (volume < 50) {
                volumeIcon.className = 'fas fa-volume-down me-2';
            } else {
                volumeIcon.className = 'fas fa-volume-up me-2';
            }
        }
    }

    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (message && this.livekitClient) {
            this.livekitClient.sendChatMessage(message);
            this.addChatMessage(message, 'user');
            input.value = '';
        }
    }

    addChatMessage(message, sender, timestamp = null) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'coach-message'}`;
        
        const time = timestamp ? new Date(timestamp) : new Date();
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(message)}</div>
                <div class="message-time">${timeStr}</div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        this.chatMessages.push({ message, sender, timestamp: time });
    }

    sendCoachMessage(data) {
        if (this.livekitClient) {
            this.livekitClient.sendDataMessage(data);
        }
    }

    initializeTimer() {
        this.sessionStartTime = new Date();
        this.startSessionTimer();
    }

    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            this.updateSessionTimer();
        }, 1000);
    }

    updateSessionTimer() {
        if (!this.sessionStartTime) return;
        
        const elapsed = Date.now() - this.sessionStartTime.getTime();
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
        
        const timerDisplay = document.getElementById('sessionTimer');
        if (timerDisplay) {
            timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    initializeChat() {
        // Add initial system message
        this.addChatMessage(
            `Welcome to your coaching session with ${this.config.coachData.name}. You can type messages here to supplement your conversation.`,
            'system'
        );
    }

    async loadDeviceOptions() {
        try {
            const devices = await this.livekitClient.getDevices();
            
            this.populateDeviceSelect('audioInput', devices.audioInputs);
            this.populateDeviceSelect('audioOutput', devices.audioOutputs);
            this.populateDeviceSelect('videoInput', devices.videoInputs);
        } catch (error) {
            console.error('Failed to load device options:', error);
        }
    }

    populateDeviceSelect(selectId, devices) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = devices.map(device => 
            `<option value="${device.deviceId}">${device.label || `Device ${device.deviceId.slice(0, 8)}`}</option>`
        ).join('');
    }

    async applySettings() {
        const audioInput = document.getElementById('audioInput')?.value;
        const audioOutput = document.getElementById('audioOutput')?.value;
        const videoInput = document.getElementById('videoInput')?.value;
        
        try {
            if (audioInput) {
                await this.livekitClient.switchAudioDevice(audioInput);
            }
            
            if (videoInput) {
                await this.livekitClient.switchVideoDevice(videoInput);
            }
            
            this.showSuccess('Settings applied successfully');
        } catch (error) {
            this.showError('Failed to apply some settings');
        }
    }

    showSettings() {
        const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
        modal.show();
    }

    showEndSessionModal() {
        const modal = new bootstrap.Modal(document.getElementById('endSessionModal'));
        modal.show();
    }

    async endSession(feedback = null) {
        try {
            // Stop recording if active
            if (this.isRecording) {
                await this.stopRecording();
            }
            
            // Stop timer
            if (this.sessionTimer) {
                clearInterval(this.sessionTimer);
            }
            
            // Send end session message to coach
            await this.sendCoachMessage({
                type: 'session_end',
                timestamp: new Date().toISOString(),
                duration: this.getSessionDuration(),
                feedback: feedback
            });
            
            // Disconnect from LiveKit
            if (this.livekitClient) {
                await this.livekitClient.disconnect();
            }
            
            this.isInitialized = false;
            
            // Submit session data to server
            await this.submitSessionData(feedback);
            
        } catch (error) {
            console.error('Error ending session:', error);
        }
    }

    async submitSessionData(feedback) {
        try {
            const sessionData = {
                meetingId: this.config.meetingId,
                duration: this.getSessionDuration(),
                chatMessages: this.chatMessages,
                feedback: feedback,
                endTime: new Date().toISOString()
            };

            const response = await fetch(`/meetings/${this.config.meetingId}/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionData)
            });

            if (response.ok) {
                window.location.href = `/meetings/${this.config.meetingId}`;
            } else {
                throw new Error('Failed to submit session data');
            }
        } catch (error) {
            console.error('Failed to submit session data:', error);
            // Still redirect but show error
            this.showError('Session ended but failed to save some data');
            setTimeout(() => {
                window.location.href = `/meetings`;
            }, 2000);
        }
    }

    getSessionDuration() {
        if (!this.sessionStartTime) return 0;
        return Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000);
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('huddle-meeting-settings');
        if (savedSettings) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            } catch (error) {
                console.error('Failed to load saved settings:', error);
            }
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('huddle-meeting-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    handlePageHidden() {
        // Reduce updates when page is hidden
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
    }

    handlePageVisible() {
        // Resume updates when page becomes visible
        this.startSessionTimer();
    }

    // UI Update Methods
    updateConnectionStatus(status) {
        if (this.livekitClient) {
            this.livekitClient.updateConnectionStatus(status);
        }
    }

    updateMicrophoneUI(enabled) {
        if (this.livekitClient) {
            this.livekitClient.updateMicrophoneButton(enabled);
        }
    }

    updateCameraUI(enabled) {
        if (this.livekitClient) {
            this.livekitClient.updateCameraButton(enabled);
        }
    }

    updateRecordingUI(recording) {
        const recordButton = document.getElementById('recordButton');
        if (recordButton) {
            recordButton.classList.toggle('btn-danger', recording);
            recordButton.classList.toggle('btn-outline-secondary', !recording);
            
            const icon = recordButton.querySelector('i');
            if (icon) {
                icon.className = recording ? 'fas fa-stop' : 'fas fa-record-vinyl';
            }
        }
    }

    updateCoachSpeaking(speaking) {
        if (this.livekitClient) {
            this.livekitClient.showCoachSpeaking(speaking);
        }
    }

    showCoachStatus(message) {
        this.showInfo(message);
    }

    showCoachSuggestions(suggestions) {
        // Display coach suggestions in the UI
        const suggestionsContainer = document.getElementById('coachSuggestions');
        if (suggestionsContainer && suggestions.length > 0) {
            suggestionsContainer.innerHTML = suggestions.map(suggestion => 
                `<div class="suggestion-item">${this.escapeHtml(suggestion)}</div>`
            ).join('');
            suggestionsContainer.style.display = 'block';
        }
    }

    displayTranscription(text, speaker) {
        const transcriptionContainer = document.getElementById('transcriptionContainer');
        if (transcriptionContainer) {
            const transcriptionDiv = document.createElement('div');
            transcriptionDiv.className = `transcription-item ${speaker}`;
            transcriptionDiv.innerHTML = `
                <span class="speaker">${speaker}:</span>
                <span class="text">${this.escapeHtml(text)}</span>
            `;
            transcriptionContainer.appendChild(transcriptionDiv);
            transcriptionContainer.scrollTop = transcriptionContainer.scrollHeight;
        }
    }

    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showSuccess(message) {
        if (window.HuddleApp) {
            window.HuddleApp.showSuccess(message);
        }
    }

    showError(message) {
        if (window.HuddleApp) {
            window.HuddleApp.showError(message);
        }
    }

    showInfo(message) {
        if (window.HuddleApp) {
            window.HuddleApp.showInfo(message);
        }
    }
}

// Initialize meeting room when called
function initializeMeetingRoom(config) {
    window.meetingRoom = new MeetingRoom(config);
    return window.meetingRoom;
}

// Export for global use
window.MeetingRoom = MeetingRoom;
window.initializeMeetingRoom = initializeMeetingRoom;