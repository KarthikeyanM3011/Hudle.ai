import React from 'react';

const AudioWaveform = ({ isAnimating = false, coachName = 'AI Coach' }) => {
  const bars = Array.from({ length: 7 }, (_, i) => i);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8">
      <div className="mb-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
          {coachName.charAt(0).toUpperCase()}
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-800 mb-6">{coachName}</h3>
      
      <div className="flex items-end space-x-1 h-16">
        {bars.map((bar) => (
          <div
            key={bar}
            className={`waveform-bar ${isAnimating ? 'animate-waveform' : ''}`}
            style={{
              animationDelay: `${bar * 0.1}s`,
              backgroundColor: isAnimating ? '#3b82f6' : '#cbd5e1',
            }}
          />
        ))}
      </div>
      
      {isAnimating && (
        <p className="mt-4 text-sm text-gray-600 animate-pulse">
          AI Coach is speaking...
        </p>
      )}
    </div>
  );
};

export default AudioWaveform;