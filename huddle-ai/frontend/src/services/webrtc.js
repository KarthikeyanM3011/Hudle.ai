class WebRTCService {
    constructor() {
      this.localStream = null;
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.isRecording = false;
    }
  
    async initializeMedia() {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        return this.localStream;
      } catch (error) {
        console.error('Error accessing media devices:', error);
        throw error;
      }
    }
  
    async startAudioRecording() {
      if (!this.localStream) {
        await this.initializeMedia();
      }
  
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.localStream, {
        mimeType: 'audio/webm',
      });
  
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
  
      this.mediaRecorder.start();
      this.isRecording = true;
    }
  
    async stopAudioRecording() {
      return new Promise((resolve) => {
        if (!this.mediaRecorder || !this.isRecording) {
          resolve(null);
          return;
        }
  
        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          this.isRecording = false;
          resolve(audioBlob);
        };
  
        this.mediaRecorder.stop();
      });
    }
  
    getVideoElement() {
      const video = document.createElement('video');
      video.srcObject = this.localStream;
      video.autoplay = true;
      video.muted = true;
      return video;
    }
  
    stopMedia() {
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
      }
    }
  
    async playAudioResponse(audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.play();
      });
    }
  }
  
  export default WebRTCService;