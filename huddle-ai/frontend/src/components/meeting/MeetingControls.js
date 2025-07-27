import React from 'react';
import { Mic, MicOff, PhoneOff, MessageSquare, StopCircle } from 'lucide-react';

const MeetingControls = ({
  isRecording,
  isMuted,
  onToggleRecording,
  onToggleMute,
  onEndMeeting,
  onOpenChat,
  onStopSpeaking,
  disabled = false
}) => {
  return (
    <div className="meeting-controls">
      <button
        onClick={onToggleMute}
        disabled={disabled}
        className={`control-button ${isMuted ? 'muted' : 'active'}`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      <button
        onClick={onToggleRecording}
        disabled={disabled}
        className={`control-button ${isRecording ? 'recording' : 'inactive'}`}
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
      >
        <Mic size={20} />
      </button>

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

      <button
        onClick={onOpenChat}
        disabled={disabled}
        className="control-button inactive"
        title="Open Chat"
      >
        <MessageSquare size={20} />
      </button>

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