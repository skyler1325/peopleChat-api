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

app.get('/api/user/:username', async (req, res) => {
  try {
    const config = { headers: { 'User-Agent': 'PenguinMod-Auth-Server' } };
    if (process.env.GH_TOKEN) {
      config.headers['Authorization'] = 'token ' + process.env.GH_TOKEN;
    }

    const usernameSanitized = req.params.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const url = 'https://github.com/skyler1325/peopleChat-server/database/' + usernameSanitized + '.json';

    const ghRes = await axios.get(url, config);
    res.json(JSON.parse(Buffer.from(ghRes.data.content, 'base64').toString('utf-8')));

  } catch (e) {
    if (e.response && e.response.status === 404) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }
    res.status(500).json({ error: 'Server read error' });
  }
});

app.post('/api/register', async (req, res) => {
  if (!req.body.username || !req.body.hash) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const config = { headers: { 'User-Agent': 'PenguinMod-Auth-Server' } };
  if (process.env.GH_TOKEN) {
    config.headers['Authorization'] = 'token ' + process.env.GH_TOKEN;
  }

  const usernameSanitized = String(req.body.username).toLowerCase().replace(/[^a-z0-9]/g, '');
  // FIXED: Added the explicit trailing slash after database
  const targetUrl = 'https://github.com/skyler1325/peopleChat-server/database/' + usernameSanitized + '.json';

  try {
    // Check if user profile already exists
    await axios.get(targetUrl, config);
    return res.status(409).json({ error: 'EXISTS' });
  } catch (e) {
    // If 404, the username is available for registration
    if (e.response && e.response.status === 404) {
      try {
        const payload = {
          message: 'Create user: ' + usernameSanitized,
          content: Buffer.from(JSON.stringify({ passwordHash: String(req.body.hash) })).toString('base64')
        };
        
        await axios.put(targetUrl, payload, config);
        return res.json({ success: true });
      } catch (writeErr) {
        // FIXED: Completely cleaned up typo properties to prevent hard runtime crashes
        const errDetails = writeErr.response ? writeErr.response.data : writeErr.message;
        return res.status(500).json({ 
          error: 'GitHub write rejected.', 
          details: errDetails 
        });
      }
    }
    res.status(500).json({ error: 'Database verification pathway failed' });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Secure server running stable'));
