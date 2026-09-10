import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      },
      colors: {
        primary: {
          dark: '#2D2A26',
        },
        background: {
          light: '#F9F8F4',
          beige: '#F2EFE9',
        },
        accent: {
          beige: '#E5E0D8',
          darkBeige: '#D4CEC5',
        },
        text: {
          muted: '#786B59',
          dark: '#4A4036',
        },
        error: '#8C3F3F',
        success: '#5C7C66',
      },
    },
  },
  plugins: [],
};

export default config;
