const express = require('express');
const { parseRow } = require('./src/parseRow');
const { fillHiesForm } = require('./src/fillHiesForm');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static('public'));

let browserContext;
let lastParsedData;

// Settings & History Setup
const historyFile = path.join(__dirname, 'history.json');
if (!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, JSON.stringify([]));

const settingsFile = path.join(__dirname, 'settings.json');
if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({
        telegramBotToken: '8578634897:AAEp0b9vY2Skr31HpmTzZ1XgH_nlXp2hxLo',
        telegramChatId: '8341692819'
    }, null, 2));
}

// SSE Logging Setup
let clients = [];
app.get('/api/logs', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    clients.push(res);
    req.on('close', () => { clients = clients.filter(c => c !== res); });
});

global.broadcastLog = function(message, type = 'info') {
    const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
    const payload = JSON.stringify({ time, type, message });
    clients.forEach(client => client.write(`data: ${payload}\n\n`));
};

// Intercept console.log to stream to frontend
const originalLog = console.log;
console.log = function(...args) {
    originalLog.apply(console, args);
    global.broadcastLog(args.join(' '), 'info');
};
const originalError = console.error;
console.error = function(...args) {
    originalError.apply(console, args);
    global.broadcastLog(args.join(' '), 'error');
};

global.saveHistory = function(entry) {
    try {
        const history = JSON.parse(fs.readFileSync(historyFile));
        entry.timestamp = new Date().toISOString();
        history.push(entry);
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch(e) {}
};

app.get('/api/history', (req, res) => {
    try { res.sendFile(historyFile); } catch(e) { res.json([]); }
});

app.get('/api/settings', (req, res) => {
    try { res.sendFile(settingsFile); } catch(e) { res.json({}); }
});

app.post('/api/settings', (req, res) => {
    fs.writeFileSync(settingsFile, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
});

app.post('/api/parse', (req, res) => {
  try {
    const parsed = parseRow(req.body.rawText);
    lastParsedData = parsed;
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single endpoint that opens a new tab in the persistent browser and fills the form
app.post('/api/fill-form', async (req, res) => {
  try {
    if (!lastParsedData) {
      return res.status(400).json({ status: 'error', message: 'No data parsed yet.' });
    }

    // Launch persistent browser if not already running
    if (!browserContext) {
      const profileDir = path.join(__dirname, 'browser-profile');
      if (!fs.existsSync(profileDir)) {
          fs.mkdirSync(profileDir, { recursive: true });
      }
      
      // Determine headless mode. On servers (like Render), it must be true.
      const isHeadless = process.env.NODE_ENV === 'production' || process.env.HEADLESS === 'true';

      browserContext = await chromium.launchPersistentContext(profileDir, {
        headless: isHeadless,
        viewport: null, // Full window size
        args: isHeadless ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] // Needed for some cloud environments
      });
    }
    
    // Always open a NEW TAB in that same browser for every new row
    const page = await browserContext.newPage();

    // Go directly to the form and fill it (fillHiesForm.js handles navigation)
    await fillHiesForm(page, lastParsedData);
    
    console.log("Success: HIES automation workflow completed.");
    res.json({ status: 'success', message: 'HIES Automation finished.' });
  } catch (err) {
    console.error("Error filling HIES form:", err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// NAPIT Endpoint
app.post('/api/fill-napit-form', async (req, res) => {
  try {
    if (!lastParsedData) {
      return res.status(400).json({ status: 'error', message: 'No data parsed yet.' });
    }
    
    const { workCompletionDate } = req.body;
    if (!workCompletionDate) {
      return res.status(400).json({ status: 'error', message: 'Work Completion Date is required for NAPIT.' });
    }

    // Launch persistent browser if not already running
    if (!browserContext) {
      const profileDir = path.join(__dirname, 'browser-profile');
      if (!fs.existsSync(profileDir)) {
          fs.mkdirSync(profileDir, { recursive: true });
      }
      
      const isHeadless = process.env.NODE_ENV === 'production' || process.env.HEADLESS === 'true';

      browserContext = await chromium.launchPersistentContext(profileDir, {
        headless: isHeadless,
        viewport: null, // Full window size
        args: isHeadless ? ['--no-sandbox', '--disable-setuid-sandbox'] : []
      });
    }
    
    const page = await browserContext.newPage();
    const { fillNapitForm } = require('./src/fillNapitForm');
    
    await fillNapitForm(page, lastParsedData, workCompletionDate);
    
    console.log("Success: NAPIT automation workflow completed.");
    res.json({ status: 'success', message: 'NAPIT Automation finished.' });
  } catch (err) {
    console.error("Error filling NAPIT form:", err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
