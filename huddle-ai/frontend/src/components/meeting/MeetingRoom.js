import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AudioWaveform from './AudioWaveForm';
import MeetingControls from './MeetingControls';
import WebRTCService from '../../services/webrtc';
import { audioAPI, meetingsAPI, chatAPI } from '../../services/api';
import { MessageSquare, X, Send, AlertCircle, CheckCircle, Loader2, Volume2, VolumeX } from 'lucide-react';

const MeetingRoom = ({ meeting, aiProfile }) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const webrtcRef = useRef(null);
  const chatContainerRef = useRef(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [audioDebugInfo, setAudioDebugInfo] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);

  useEffect(() => {
    initializeWebRTC();
    loadChatHistory();
    startMeeting();
    testAudioPlayback();
    
    // Duration timer
    const timer = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);
    
    return () => {
      clearInterval(timer);
      if (webrtcRef.current) {
        webrtcRef.current.stopMedia();
      }
    };
  }, []);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const testAudioPlayback = async () => {
    try {
      if (webrtcRef.current) {
        const result = await webrtcRef.current.testAudioPlayback();
        setAudioDebugInfo(prev => prev + `Audio test: ${result ? 'PASS' : 'FAIL'}\n`);
      }
    } catch (error) {
      setAudioDebugInfo(prev => prev + `Audio test error: ${error.message}\n`);
    }
  };

  const testTTSService = async () => {
    try {
      setAudioDebugInfo(prev => prev + 'Testing TTS service...\n');
      const response = await audioAPI.synthesize(meeting.uuid, 'This is a test of the text to speech system.');
      
      if (response.data && response.data.size > 0) {
        setAudioDebugInfo(prev => prev + `TTS test successful: ${response.data.size} bytes\n`);
        
        // Try to play the test audio
        if (webrtcRef.current) {
          await webrtcRef.current.playAudioResponse(response.data);
          setAudioDebugInfo(prev => prev + 'TTS test audio played successfully\n');
        }
      } else {
        setAudioDebugInfo(prev => prev + 'TTS test failed: No audio data\n');
      }
    } catch (error) {
      setAudioDebugInfo(prev => prev + `TTS test error: ${error.message}\n`);
    }
  };

  const initializeWebRTC = async () => {
    try {
      setConnectionStatus('connecting');
      setMediaError('');
      
      webrtcRef.current = new WebRTCService();
      const stream = await webrtcRef.current.initializeMedia();
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setConnectionStatus('connected');
      setAudioDebugInfo(prev => prev + 'WebRTC initialized successfully\n');
      console.log('WebRTC initialized successfully');
    } catch (error) {
      console.error('Failed to initialize media:', error);
      setMediaError(error.message || 'Failed to access camera and microphone');
      setConnectionStatus('error');
      setAudioDebugInfo(prev => prev + `WebRTC error: ${error.message}\n`);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await chatAPI.getHistory(meeting.uuid);
      setChatMessages(response.data);
      console.log(`Loaded ${response.data.length} chat messages`);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const startMeeting = async () => {
    try {
      await meetingsAPI.start(meeting.uuid);
      console.log('Meeting started successfully');
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
        setAudioDebugInfo(prev => prev + 'Audio recording started\n');
        console.log('Started audio recording');
      } catch (error) {
        console.error('Failed to start recording:', error);
        setMediaError('Failed to start recording: ' + error.message);
        setAudioDebugInfo(prev => prev + `Recording error: ${error.message}\n`);
      }
    } else {
      await handleStopSpeaking();
    }
  };

  const handleStopSpeaking = async () => {
    if (!isRecording || processing) return;

    setProcessing(true);
    setIsRecording(false);
    setAudioDebugInfo(prev => prev + 'Processing audio...\n');

    try {
      console.log('Stopping audio recording...');
      const audioBlob = await webrtcRef.current.stopAudioRecording();
      
      if (audioBlob && audioBlob.size > 0) {
        console.log('Processing audio blob of size:', audioBlob.size);
        setAudioDebugInfo(prev => prev + `Audio blob: ${audioBlob.size} bytes\n`);
        
        // Show AI as thinking
        setIsAISpeaking(true);
        
        const response = await audioAPI.processAudio(meeting.uuid, audioBlob);
        
        // Get transcript and AI response from headers
        const userTranscript = response.headers['x-transcript'];
        const aiResponse = response.headers['x-ai-response'];
        const audioLength = response.headers['x-audio-length'];
        
        console.log('User transcript:', userTranscript);
        console.log('AI response:', aiResponse);
        console.log('Audio length:', audioLength);
        
        setAudioDebugInfo(prev => prev + `Transcript: "${userTranscript}"\n`);
        setAudioDebugInfo(prev => prev + `AI Response: "${aiResponse?.substring(0, 50)}..."\n`);
        setAudioDebugInfo(prev => prev + `Response audio: ${audioLength} bytes\n`);
        
        if (userTranscript) {
          setLastUserMessage(userTranscript);
          setTranscript(prev => prev + '\nUser: ' + userTranscript);
        }
        
        if (aiResponse) {
          setTranscript(prev => prev + '\nAI: ' + aiResponse);
          
          if (ttsEnabled && response.data && response.data.size > 0) {
            try {
              setAudioDebugInfo(prev => prev + 'Playing AI audio response...\n');
              // Play the audio response
              const audioBlob = new Blob([response.data], { type: 'audio/wav' });
              await webrtcRef.current.playAudioResponse(audioBlob);
              setAudioDebugInfo(prev => prev + 'Audio playback completed\n');
              console.log('Audio response played successfully');
            } catch (playError) {
              console.error('Failed to play audio response:', playError);
              setAudioDebugInfo(prev => prev + `Audio playback error: ${playError.message}\n`);
              
              // Try alternative playback method
              try {
                setAudioDebugInfo(prev => prev + 'Trying Web Audio API...\n');
                await webrtcRef.current.playAudioResponseWithWebAudio(audioBlob);
                setAudioDebugInfo(prev => prev + 'Web Audio playback successful\n');
              } catch (webAudioError) {
                setAudioDebugInfo(prev => prev + `Web Audio error: ${webAudioError.message}\n`);
                setMediaError('Audio playback failed. Please check your speakers.');
              }
            }
          } else {
            setAudioDebugInfo(prev => prev + `TTS disabled or no audio data (${response.data?.size || 0} bytes)\n`);
          }
        }
        
        // Reload chat history to get updated messages
        await loadChatHistory();
      } else {
        console.warn('No audio data recorded');
        setAudioDebugInfo(prev => prev + 'No audio data recorded\n');
        setMediaError('No audio detected. Please try speaking again.');
      }
    } catch (error) {
      console.error('Failed to process audio:', error);
      setAudioDebugInfo(prev => prev + `Processing error: ${error.message}\n`);
      setMediaError('Failed to process audio: ' + error.message);
    } finally {
      setProcessing(false);
      setIsAISpeaking(false);
    }
  };

  const handleToggleMute = () => {
    if (webrtcRef.current) {
      const muted = webrtcRef.current.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleToggleVideo = () => {
    if (webrtcRef.current) {
      const videoOff = webrtcRef.current.toggleVideo();
      setIsVideoOff(videoOff);
    }
  };

  const handleEndMeeting = async () => {
    if (window.confirm('Are you sure you want to end this meeting?')) {
      try {
        await meetingsAPI.end(meeting.uuid, transcript);
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to end meeting:', error);
        navigate('/dashboard');
      }
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || sendingMessage) return;

    const messageToSend = chatInput.trim();
    setChatInput('');
    setSendingMessage(true);

    try {
      console.log('Sending chat message:', messageToSend);
      
      // Send message and get response
      const response = await chatAPI.sendMessage(meeting.uuid, messageToSend);
      console.log('Chat response:', response.data);
      
      // Reload chat history to get both user and AI messages
      await loadChatHistory();
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setChatInput(messageToSend); // Restore message on error
      setMediaError('Failed to send message: ' + error.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  const clearAudioDebugInfo = () => {
    setAudioDebugInfo('');
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Main Meeting Area */}
      <div className="flex-1 relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 text-white p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">{meeting.title}</h2>
              <p className="text-sm text-gray-300">
                with {aiProfile?.coach_name || 'AI Coach'} • {formatDuration(meetingDuration)}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
                connectionStatus === 'connected' ? 'bg-green-900 text-green-200' :
                connectionStatus === 'connecting' ? 'bg-yellow-900 text-yellow-200' :
                'bg-red-900 text-red-200'
              }`}>
                {connectionStatus === 'connected' && <CheckCircle size={14} />}
                {connectionStatus === 'error' && <AlertCircle size={14} />}
                <span className="capitalize">{connectionStatus}</span>
              </div>
              
              {/* TTS Toggle */}
              {/* <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                  ttsEnabled ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                }`}
                title={ttsEnabled ? 'Disable AI Voice' : 'Enable AI Voice'}
              >
                {ttsEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                <span>TTS</span>
              </button> */}
              
              {/* Debug Button */}
              {/* <button
                onClick={testTTSService}
                className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs"
                title="Test TTS Service"
              >
                Test TTS
              </button> */}
            </div>
          </div>
          
          {/* Error Display */}
          {mediaError && (
            <div className="mt-2 p-2 bg-red-600 rounded text-sm">
              {mediaError}
              <button 
                onClick={() => setMediaError('')}
                className="ml-2 text-red-200 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
          
          {/* Audio Debug Info */}
          {/* {audioDebugInfo && (
            <div className="mt-2 p-2 bg-gray-800 rounded text-xs">
              <div className="flex justify-between items-start">
                <span className="text-gray-300">Debug Info:</span>
                <button
                  onClick={clearAudioDebugInfo}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <pre className="text-gray-400 whitespace-pre-wrap text-xs mt-1 max-h-20 overflow-y-auto">
                {audioDebugInfo}
              </pre>
            </div>
          )} */}
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-2 h-full gap-4 p-4 pt-20">
          {/* User Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {mediaError && connectionStatus === 'error' ? (
              <div className="flex flex-col items-center justify-center h-full text-white p-8">
                <AlertCircle size={48} className="text-red-400 mb-4" />
                <p className="text-center text-red-300 mb-4">{mediaError}</p>
                <button
                  onClick={initializeWebRTC}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Retry Camera Access
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                />
                {isVideoOff && (
                  <div className="flex items-center justify-center h-full bg-gray-700">
                    <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                      You
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                  You {isMuted && '(Muted)'} {isVideoOff && '(Video Off)'}
                </div>
                {isRecording && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                    Recording...
                  </div>
                )}
                {processing && (
                  <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center">
                    <Loader2 size={14} className="animate-spin mr-1" />
                    Processing...
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* AI Coach Display */}
          <div className="bg-white rounded-lg shadow-lg">
            <AudioWaveform 
              isAnimating={isAISpeaking || processing} 
              coachName={aiProfile?.coach_name || 'AI Coach'}
              coachRole={aiProfile?.coach_role || 'AI Assistant'}
              lastMessage={lastUserMessage}
              processing={processing}
            />
          </div>
        </div>
        
        {/* Meeting Controls */}
        <MeetingControls
          isRecording={isRecording}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onToggleRecording={handleToggleRecording}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onEndMeeting={handleEndMeeting}
          onOpenChat={() => setShowChat(!showChat)}
          onStopSpeaking={handleStopSpeaking}
          disabled={processing || connectionStatus !== 'connected'}
        />
      </div>
      
      {/* Chat Panel */}
      {showChat && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Chat</h3>
            <button
              onClick={() => setShowChat(false)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
          >
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.is_user ? 'justify-end' : 'justify-start'} message-enter`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 rounded-2xl text-sm shadow-sm ${
                      message.is_user
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.message}</p>
                    <p className={`text-xs mt-1 ${
                      message.is_user ? 'text-primary-200' : 'text-gray-500'
                    }`}>
                      {new Date(message.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {sendingMessage && (
              <div className="flex justify-center">
                <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm flex items-center">
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Sending message...
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-2">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={sendingMessage}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none disabled:bg-gray-100"
                rows="2"
              />
              <button
                onClick={handleSendChatMessage}
                disabled={!chatInput.trim() || sendingMessage}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {sendingMessage ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRoom;