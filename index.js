const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin.includes('penguinmod.com') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by Security Policy'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json());

// Main diagnostics route to check if your Render Token is visible to the server code
app.get('/api/debug-token', (req, res) => {
  const tokenExists = !!process.env.GH_TOKEN;
  const tokenLength = process.env.GH_TOKEN ? process.env.GH_TOKEN.length : 0;
  res.json({ 
    tokenFound: tokenExists, 
    characterCount: tokenLength,
    tokenPreview: tokenExists ? process.env.GH_TOKEN.substring(0, 10) + '...' : 'NONE'
  });
});

app.get('/api/user/:username', async (req, res) => {
  try {
    const config = { headers: { 'User-Agent': 'PenguinMod-Auth-Server' } };
    if (process.env.GH_TOKEN && process.env.GH_TOKEN.trim() !== '') {
      config.headers['Authorization'] = 'token ' + process.env.GH_TOKEN.trim();
    }

    const usernameSanitized = req.params.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const url = 'https://github.com/skyler1325/peopleChat-server/database/' + usernameSanitized + '.json';

    const ghRes = await axios.get(url, config);
    res.json(JSON.parse(Buffer.from(ghRes.data.content, 'base64').toString('utf-8')));

  } catch (e) {
    if (e.response && e.response.status === 404) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }
    res.status(500).json({ error: 'Server read crash', message: e.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    if (!req.body.username || !req.body.hash) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const config = { headers: { 'User-Agent': 'PenguinMod-Auth-Server' } };
    if (process.env.GH_TOKEN && process.env.GH_TOKEN.trim() !== '') {
      config.headers['Authorization'] = 'token ' + process.env.GH_TOKEN.trim();
    }

    const usernameSanitized = String(req.body.username).toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetUrl = 'https://github.com/skyler1325/peopleChat-server/database/' + usernameSanitized + '.json';

    let userExists = false;
    try {
      await axios.get(targetUrl, config);
      userExists = true;
    } catch (checkErr) {
      if (!checkErr.response || checkErr.response.status !== 404) {
        // If it fails for any reason OTHER than a 404, throw it out to the main handler
        throw new Error('GitHub Check Failed: ' + (checkErr.response ? JSON.stringify(checkErr.response.data) : checkErr.message));
      }
    }

    if (userExists) {
      return res.status(409).json({ error: 'EXISTS' });
    }

    const payload = {
      message: 'Create user: ' + usernameSanitized,
      content: Buffer.from(JSON.stringify({ passwordHash: String(req.body.hash) })).toString('base64')
    };
    
    await axios.put(targetUrl, payload, config);
    return res.json({ success: true });

  } catch (mainError) {
    // FORCE the server to return the exact raw string message instead of generic HTML
    return res.status(500).json({ 
      error: 'CRITICAL_SERVER_CRASH', 
      message: mainError.message,
      stack: mainError.stack
    });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Secure server running stable'));
