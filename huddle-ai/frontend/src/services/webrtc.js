class WebRTCService {
  constructor() {
    this.localStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.audioContext = null;
    this.currentAudio = null;
  }

  async initializeMedia() {
    try {
      // Request permissions first
      const constraints = {
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Media initialized successfully');
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Fallback: try with basic constraints
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        return this.localStream;
      } catch (fallbackError) {
        console.error('Fallback media access failed:', fallbackError);
        throw new Error('Unable to access camera and microphone. Please check permissions.');
      }
    }
  }

  async startAudioRecording() {
    if (!this.localStream) {
      await this.initializeMedia();
    }

    this.audioChunks = [];
    
    // Create audio-only stream for recording
    const audioStream = new MediaStream();
    this.localStream.getAudioTracks().forEach(track => {
      audioStream.addTrack(track);
    });

    try {
      // Try different MIME types for better compatibility
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];

      let selectedMimeType = null;
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported audio format found');
      }

      this.mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      console.log('Audio recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopAudioRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { 
            type: 'audio/wav' 
          });
          this.isRecording = false;
          console.log('Audio recording stopped, blob size:', audioBlob.size);
          resolve(audioBlob);
        } catch (error) {
          console.error('Error creating audio blob:', error);
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  async playAudioResponse(audioBlob) {
    try {
      console.log('Playing audio response, blob size:', audioBlob.size);
      
      // Stop any currently playing audio
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }
      
      // Create audio URL
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Created audio URL:', audioUrl);
      
      // Create and configure audio element
      const audio = new Audio();
      this.currentAudio = audio;
      
      // Set audio properties for better compatibility
      audio.preload = 'auto';
      audio.volume = 1.0;
      
      return new Promise((resolve, reject) => {
        let resolved = false;
        
        const cleanup = () => {
          if (!resolved) {
            resolved = true;
            URL.revokeObjectURL(audioUrl);
          }
        };
        
        audio.onended = () => {
          console.log('Audio playback ended');
          cleanup();
          this.currentAudio = null;
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          console.error('Audio error details:', {
            error: audio.error,
            networkState: audio.networkState,
            readyState: audio.readyState,
            src: audio.src
          });
          cleanup();
          this.currentAudio = null;
          reject(new Error(`Audio playback failed: ${audio.error?.message || 'Unknown error'}`));
        };
        
        audio.oncanplaythrough = () => {
          console.log('Audio can play through, starting playback');
          audio.play().catch(playError => {
            console.error('Audio play() failed:', playError);
            cleanup();
            this.currentAudio = null;
            reject(playError);
          });
        };
        
        audio.onloadstart = () => {
          console.log('Audio load started');
        };
        
        audio.onloadeddata = () => {
          console.log('Audio data loaded');
        };
        
        audio.oncanplay = () => {
          console.log('Audio can start playing');
        };
        
        // Set source and load
        audio.src = audioUrl;
        audio.load();
        
        // Fallback timeout
        setTimeout(() => {
          if (!resolved) {
            console.warn('Audio playback timeout, forcing resolve');
            cleanup();
            this.currentAudio = null;
            resolve();
          }
        }, 30000); // 30 second timeout
      });
      
    } catch (error) {
      console.error('Error setting up audio playback:', error);
      throw error;
    }
  }

  // Alternative playback method using Web Audio API
  async playAudioResponseWithWebAudio(audioBlob) {
    try {
      console.log('Using Web Audio API for playback');
      
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      return new Promise((resolve) => {
        source.onended = () => {
          console.log('Web Audio playback ended');
          resolve();
        };
        source.start();
      });
      
    } catch (error) {
      console.error('Web Audio API playback failed:', error);
      throw error;
    }
  }

  // Test audio playback with a simple beep
  async testAudioPlayback() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Generate a simple beep
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.2);
      
      return true;
    } catch (error) {
      console.error('Audio test failed:', error);
      return false;
    }
  }

  toggleMute() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      return !audioTracks[0]?.enabled;
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      return !videoTracks[0]?.enabled;
    }
    return false;
  }

  stopMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
      console.log('Media streams stopped');
    }
    
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getStreamStats() {
    if (!this.localStream) return null;
    
    const videoTracks = this.localStream.getVideoTracks();
    const audioTracks = this.localStream.getAudioTracks();
    
    return {
      video: {
        enabled: videoTracks.length > 0 && videoTracks[0].enabled,
        settings: videoTracks[0]?.getSettings()
      },
      audio: {
        enabled: audioTracks.length > 0 && audioTracks[0].enabled,
        settings: audioTracks[0]?.getSettings()
      }
    };
  }
}

export default WebRTCService;