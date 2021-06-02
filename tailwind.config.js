const colors = require("tailwindcss/colors");

module.exports = {
  purge: [
    "./src/*.js",
    "./src/*.jsx",
    "./src/**/*.js",
    "./src/**/*.jsx",
    "./src/renderer/index.html",
  ],
  mode: 'jit',
  darkMode: "media",
  plugins: []
};
