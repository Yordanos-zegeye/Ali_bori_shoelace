/** @type {import('tailwindcss').Config} */
const withOpacity = (variableName) => {
  return ({ opacityValue }) => {
    return opacityValue !== undefined
      ? `rgba(var(${variableName}), ${opacityValue})`
      : `rgb(var(${variableName}))`;
  };
};

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        factory: {
          dark: withOpacity('--factory-dark'),
          darkCard: withOpacity('--factory-dark-card'),
          darkBorder: withOpacity('--factory-dark-border'),
          primary: withOpacity('--factory-primary'),
          primaryHover: withOpacity('--factory-primary-hover'),
          secondary: withOpacity('--factory-secondary'),
          secondaryHover: withOpacity('--factory-secondary-hover'),
          canvas: withOpacity('--factory-canvas'),
          cream: withOpacity('--factory-cream'),
          creamCard: withOpacity('--factory-cream-card'),
          crimson: withOpacity('--factory-crimson'),
          slate: withOpacity('--factory-slate'),
          muted: withOpacity('--factory-muted'),
          paper: withOpacity('--factory-paper'),
          paperLight: withOpacity('--factory-paper-light'),
          amber: withOpacity('--factory-amber'),
          amberDark: withOpacity('--factory-amber-dark'),
          rust: withOpacity('--factory-rust'),
          rustLight: withOpacity('--factory-rust-light'),
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
