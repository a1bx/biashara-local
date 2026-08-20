export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        canvas: '#080B0C',
        surface: '#0E1415',
        panel: '#121A1B',
        raised: '#172122',
        line: '#1F2B2C',
        hairline: '#182122',
        ink: '#E6EFEE',
        muted: '#8DA1A0',
        faint: '#5D7170',
        brand: {
          DEFAULT: '#17B8A6',
          bright: '#2DD4BF',
          deep: '#0F8478',
          soft: '#0C302D',
        },
        income: '#2DD4BF',
        expense: '#F0555C',
        warn: '#F5A524',
        info: '#4C82F7',
        violet: '#8B7CF6',
        success: '#34D399',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
}
