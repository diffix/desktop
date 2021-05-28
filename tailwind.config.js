const colors = require("tailwindcss/colors");

module.exports = {
  purge: [
    "./src/**/*.js",
    "./public/index.html",
  ],
  // mode: 'jit', // Hot reloading doesn't seem to work for JIT mode?
  darkMode: "media",
  plugins: []
};
