module.exports = {
  plugins: {
    // Tailwind CSS v4 ships its PostCSS integration as a separate package and
    // handles vendor prefixing itself, so autoprefixer is no longer needed.
    '@tailwindcss/postcss': {}
  }
};
