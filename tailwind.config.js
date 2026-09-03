/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta dark-first. `bg`/`surface`/`text` son los tokens de uso diario;
        // el pulido visual final vendrá después.
        bg: '#0B0D10',
        surface: '#15181D',
        'surface-2': '#1E232B',
        border: '#2A2F38',
        text: '#F2F4F7',
        'text-muted': '#9AA4B2',
        primary: '#4F8CFF',
        'primary-fg': '#FFFFFF',
        income: '#3ECF8E',
        expense: '#FF6B6B',
        warning: '#F5A623',

        // Acentos por sección (estilo Buddy): Vista general púrpura,
        // Presupuesto verde, Carteras rosa. `from`/`to` son las paradas
        // del degradado de cabecera; `DEFAULT` el tinte plano.
        overview: { DEFAULT: '#7C5CFC', from: '#5B3FD6', to: '#9B7BFF' },
        budget: { DEFAULT: '#2FBF71', from: '#1F9D5B', to: '#3ED88A' },
        walletsAccent: { DEFAULT: '#F0568F', from: '#D63D77', to: '#FF7FB0' },
      },
    },
  },
  plugins: [],
};
