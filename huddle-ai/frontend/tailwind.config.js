module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      },
      animation: {
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'waveform': 'waveform 1s ease-in-out infinite alternate',
      },
      keyframes: {
        waveform: {
          '0%': { transform: 'scaleY(1)' },
          '100%': { transform: 'scaleY(0.3)' },
        }
      }
    },
  },
  plugins: [],
}