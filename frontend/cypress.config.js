const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://localhost',
    supportFile: false,
    video: false,
    chromeWebSecurity: false,
  },
});