/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dtu: {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#64748b',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          accent: '#2563eb',
        },
      },
    },
  },
  plugins: [],
};
