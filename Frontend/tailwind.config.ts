import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
    },
    fontSize: {
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['14px', { lineHeight: '20px' }],
      base: ['16px', { lineHeight: '24px' }],
      lg: ['24px', { lineHeight: '32px' }],
      xl: ['40px', { lineHeight: '48px' }],
    },
    fontWeight: {
      normal: '400',
      semibold: '600',
    },
    spacing: {
      '0': '0px',
      '1': '8px',
      '2': '16px',
      '3': '24px',
      '4': '32px',
      '5': '40px',
      '6': '48px',
      '8': '64px',
      '12': '96px',
      px: '1px',
      '0.5': '4px',
    },
    borderRadius: {
      none: '0px',
      sm: '2px',
      DEFAULT: '2px',
    },
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        hairline: '#E0E0E0',
        primary: '#111111',
        secondary: '#666666',
        disabled: '#AAAAAA',
        accent: '#E30613',
        success: '#1A7F37',
      },
      gridTemplateColumns: {
        '12': 'repeat(12, minmax(0, 1fr))',
        '8': 'repeat(8, minmax(0, 1fr))',
        '4': 'repeat(4, minmax(0, 1fr))',
      },
      gap: {
        grid: '24px',
      },
      boxShadow: {
        none: 'none',
      },
      outline: {
        focus: ['2px solid #111111', '2px'],
      },
    },
  },
  plugins: [],
};

export default config;
