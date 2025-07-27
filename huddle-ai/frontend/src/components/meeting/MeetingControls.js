import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, StopCircle } from 'lucide-react';

const MeetingControls = ({
  isRecording,
  isMuted,
  isVideoOff,
  onToggleRecording,
  onToggleMute,
  onToggleVideo,
  onEndMeeting,
  onOpenChat,
  onStopSpeaking,
  disabled = false
}) => {
  return (
    <div className="meeting-controls">
      {/* Mute Button */}
      <button
        onClick={onToggleMute}
        disabled={disabled}
        className={`control-button ${isMuted ? 'muted' : 'active'}`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      {/* Video Toggle Button */}
      <button
        onClick={onToggleVideo}
        disabled={disabled}
        className={`control-button ${isVideoOff ? 'muted' : 'active'}`}
        title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
      >
        {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
      </button>

      {/* Recording Button */}
      <button
        onClick={onToggleRecording}
        disabled={disabled}
        className={`control-button ${isRecording ? 'recording' : 'inactive'}`}
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
      >
        <Mic size={20} />
      </button>

      {/* Stop Speaking Button - only show when recording */}
      {isRecording && (
        <button
          onClick={onStopSpeaking}
          disabled={disabled}
          className="control-button active"
          title="Stop Speaking"
        >
          <StopCircle size={20} />
        </button>
      )}

      {/* Chat Button */}
      <button
        onClick={onOpenChat}
        disabled={disabled}
        className="control-button inactive"
        title="Open Chat"
      >
        <MessageSquare size={20} />
      </button>

      {/* End Meeting Button */}
      <button
        onClick={onEndMeeting}
        disabled={disabled}
        className="control-button"
        style={{ backgroundColor: '#ef4444' }}
        title="End Meeting"
      >
        <PhoneOff size={20} />
      </button>
    </div>
  );
};

export default MeetingControls;