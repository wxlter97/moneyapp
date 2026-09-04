/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Tokens semánticos. Los valores viven en global.css como CSS vars
        // (tema claro en :root, oscuro en :root.dark). `<alpha-value>` permite
        // usar `bg-border/60`, etc.
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--color-surface-2) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-fg': 'rgb(var(--color-primary-fg) / <alpha-value>)',
        income: 'rgb(var(--color-income) / <alpha-value>)',
        expense: 'rgb(var(--color-expense) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',

        // Acentos por sección (estilo Buddy): iguales en claro y oscuro porque
        // van sobre degradados. `from`/`to` son las paradas del degradado.
        overview: { DEFAULT: '#7C5CFC', from: '#5B3FD6', to: '#9B7BFF' },
        budget: { DEFAULT: '#2FBF71', from: '#1F9D5B', to: '#3ED88A' },
        walletsAccent: { DEFAULT: '#F0568F', from: '#D63D77', to: '#FF7FB0' },
      },
    },
  },
  plugins: [],
};
