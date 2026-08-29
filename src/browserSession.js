const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function getBrowserContext() {
  const profileDir = path.join(__dirname, '..', 'browser-profile');
  
  // Ensure the directory exists
  if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
  }

  // Launch a persistent context to maintain login sessions
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false, // Must be false so the user can see it and log in the first time
    viewport: null, // Let it use a reasonable default or max window
  });

  return context;
}

module.exports = { getBrowserContext };
