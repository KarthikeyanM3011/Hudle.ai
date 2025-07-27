import React from 'react';
import { Loader2, MessageCircle } from 'lucide-react';

const AudioWaveform = ({ 
  isAnimating = false, 
  coachName = 'AI Coach', 
  coachRole = 'AI Assistant',
  lastMessage = '',
  processing = false 
}) => {
  const bars = Array.from({ length: 7 }, (_, i) => i);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8 relative">
      {/* Coach Avatar */}
      <div className="mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
          {coachName.charAt(0).toUpperCase()}
        </div>
      </div>
      
      {/* Coach Info */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-1">{coachName}</h3>
        <p className="text-gray-600 font-medium">{coachRole}</p>
      </div>
      
      {/* Status and Waveform */}
      <div className="flex flex-col items-center space-y-4">
        {processing ? (
          <div className="flex items-center space-x-2 text-blue-600">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-medium">Processing your message...</span>
          </div>
        ) : isAnimating ? (
          <>
            <div className="flex items-end space-x-1 h-16">
              {bars.map((bar) => (
                <div
                  key={bar}
                  className="waveform-bar bg-blue-500"
                  style={{
                    height: `${20 + Math.random() * 30}px`,
                    animationDelay: `${bar * 0.1}s`,
                    animation: 'waveform 1s ease-in-out infinite alternate',
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-blue-600 font-medium animate-pulse">
              AI Coach is speaking...
            </p>
          </>
        ) : (
          <div className="flex items-end space-x-1 h-16">
            {bars.map((bar) => (
              <div
                key={bar}
                className="w-1 bg-gray-300 rounded-full"
                style={{ height: `${15 + (bar % 3) * 10}px` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Last User Message */}
      {lastMessage && !processing && !isAnimating && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="flex items-start space-x-2">
              <MessageCircle size={16} className="text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-1">You said:</p>
                <p className="text-sm text-gray-700">
                  {lastMessage.length > 80 ? lastMessage.substring(0, 80) + '...' : lastMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coaching Tips */}
      {!isAnimating && !processing && !lastMessage && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">💡 Tips for better coaching:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Be specific about your goals</li>
              <li>• Ask for examples and feedback</li>
              <li>• Practice scenarios out loud</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioWaveform;