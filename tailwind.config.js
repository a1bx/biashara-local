function themeColor(name) {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: themeColor('canvas'),
        surface: themeColor('surface'),
        panel: themeColor('panel'),
        raised: themeColor('raised'),
        line: themeColor('line'),
        hairline: themeColor('hairline'),
        ink: themeColor('ink'),
        muted: themeColor('muted'),
        faint: themeColor('faint'),
        brand: {
          DEFAULT: themeColor('brand'),
          bright: themeColor('brand-bright'),
          deep: themeColor('brand-deep'),
          soft: themeColor('brand-soft'),
        },
        income: themeColor('income'),
        expense: themeColor('expense'),
        warn: themeColor('warn'),
        info: themeColor('info'),
        violet: themeColor('violet'),
        success: themeColor('success'),
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
