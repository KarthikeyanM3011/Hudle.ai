import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AudioWaveform from './AudioWaveForm';
import MeetingControls from './MeetingControls';
import WebRTCService from '../../services/webrtc';
import { audioAPI, meetingsAPI, chatAPI } from '../../services/api';
import { MessageSquare, X } from 'lucide-react';

const MeetingRoom = ({ meeting, aiProfile }) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const webrtcRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    initializeWebRTC();
    loadChatHistory();
    startMeeting();
    
    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.stopMedia();
      }
    };
  }, []);

  const initializeWebRTC = async () => {
    try {
      webrtcRef.current = new WebRTCService();
      const stream = await webrtcRef.current.initializeMedia();
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to initialize media:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await chatAPI.getHistory(meeting.uuid);
      setChatMessages(response.data);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const startMeeting = async () => {
    try {
      await meetingsAPI.start(meeting.uuid);
    } catch (error) {
      console.error('Failed to start meeting:', error);
    }
  };

  const handleToggleRecording = async () => {
    if (processing) return;

    if (!isRecording) {
      try {
        await webrtcRef.current.startAudioRecording();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    } else {
      await handleStopSpeaking();
    }
  };

  const handleStopSpeaking = async () => {
    if (!isRecording || processing) return;

    setProcessing(true);
    setIsRecording(false);

    try {
      const audioBlob = await webrtcRef.current.stopAudioRecording();
      if (audioBlob) {
        const response = await audioAPI.processAudio(meeting.uuid, audioBlob);
        
        const userTranscript = response.headers['x-transcript'];
        const aiResponse = response.headers['x-ai-response'];
        
        if (userTranscript) {
          setTranscript(prev => prev + '\nUser: ' + userTranscript);
        }
        
        if (aiResponse) {
          setTranscript(prev => prev + '\nAI: ' + aiResponse);
          setIsAISpeaking(true);
          
          const audioBlob = new Blob([response.data], { type: 'audio/wav' });
          await webrtcRef.current.playAudioResponse(audioBlob);
          
          setIsAISpeaking(false);
        }
        
        loadChatHistory();
      }
    } catch (error) {
      console.error('Failed to process audio:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleMute = () => {
    if (webrtcRef.current && webrtcRef.current.localStream) {
      const audioTracks = webrtcRef.current.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleEndMeeting = async () => {
    try {
      await meetingsAPI.end(meeting.uuid, transcript);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to end meeting:', error);
      navigate('/dashboard');
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    try {
      await chatAPI.sendMessage(meeting.uuid, chatInput);
      setChatInput('');
      loadChatHistory();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="flex-1 relative">
        <div className="grid grid-cols-2 h-full gap-4 p-4">
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              You
            </div>
          </div>
          
          <div className="bg-white rounded-lg">
            <AudioWaveform 
              isAnimating={isAISpeaking} 
              coachName={aiProfile?.coach_name || 'AI Coach'} 
            />
          </div>
        </div>
        
        <MeetingControls
          isRecording={isRecording}
          isMuted={isMuted}
          onToggleRecording={handleToggleRecording}
          onToggleMute={handleToggleMute}
          onEndMeeting={handleEndMeeting}
          onOpenChat={() => setShowChat(!showChat)}
          onStopSpeaking={handleStopSpeaking}
          disabled={processing}
        />
      </div>
      
      {showChat && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Chat</h3>
            <button
              onClick={() => setShowChat(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.is_user ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    message.is_user
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.message}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSendChatMessage}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRoom;