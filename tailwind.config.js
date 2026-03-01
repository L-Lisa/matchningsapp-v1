/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary':     '#F7F5F2',
        'bg-secondary':   '#EFECE8',
        'bg-white':       '#FFFFFF',
        'accent-primary': '#1D6B6E',
        'accent-hover':   '#155557',
        'accent-light':   '#E8F4F4',
        'petra':          '#2D6A8F',
        'nancy':          '#6B4C8F',
        'julia':          '#2D7A5B',
        'nikola':         '#8F5C2D',
        'danger':         '#C0392B',
        'warning':        '#D68910',
        'success':        '#1E8449',
        'text-primary':   '#1A1A1A',
        'text-secondary': '#555550',
        'text-muted':     '#8A8A85',
        'border':         '#D8D4CE',
      },
      fontFamily: {
        display: ['DM Serif Display', 'Georgia', 'serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
};
