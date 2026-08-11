/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Tokens exatos da tela do Assistente IA — ver especificação técnica
        // (seção 2.1). Fixos (não seguem --ac do tema do técnico) porque a
        // referência visual usa uma paleta própria de marca para esta tela.
        aiHero: {
          900: '#0D2F5E',
          600: '#1E63C9',
          cyan: '#7DD3FC',
          composer: '#122A4E',
        },
      }
    },
  },
  plugins: [],
}

