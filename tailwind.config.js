/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['Archivo_500Medium'],
    },
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
      },
      // Identidad wxlter. (Fase 3): radios chicos en toda la app (un solo
      // cambio en vez de tocar cada `rounded-xl`/`rounded-2xl`) -- la
      // disciplina estructural que se toma de Ledger Brutalism, no sus
      // colores. Antes eran más grandes ("esquinas suaves, más orgánico");
      // ahora el borde fino + radio chico es parte de la identidad.
      borderRadius: {
        lg: '6px',
        xl: '8px',
        '2xl': '10px',
        '3xl': '14px',
      },
    },
  },
  plugins: [],
};
