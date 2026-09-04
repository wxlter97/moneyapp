/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['Manrope_500Medium'],
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
      // Esquinas más suaves en toda la app (un solo cambio en vez de tocar
      // cada `rounded-xl`/`rounded-2xl`): menos "brusco", más orgánico.
      borderRadius: {
        lg: '14px',
        xl: '18px',
        '2xl': '26px',
        '3xl': '32px',
      },
    },
  },
  plugins: [],
};
