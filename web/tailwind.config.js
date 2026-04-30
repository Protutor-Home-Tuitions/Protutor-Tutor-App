/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Match existing CSS variables from admin_1.html
        blue: {
          DEFAULT: '#1A56DB',
          light: '#EFF6FF',
          hover: '#1447C0',
        },
        success: '#16A34A',
        danger: '#DC2626',
        warning: '#D97706',
        border: '#E2E8F0',
        text: {
          DEFAULT: '#0F172A',
          2: '#475569',
          3: '#94A3B8',
        },
        sidebar: '#1E293B',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
