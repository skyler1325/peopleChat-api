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

// Ensure this matches your exact user and repo configuration
const REPO = "skyler1325/peopleChat-api"; 
const TOKEN = process.env.GH_TOKEN;

app.get('/api/user/:username', async (req, res) => {
  const user = req.params.username.toLowerCase().replace(/[^a-z0-9]/g, '');
  const url = `https://github.com/skyler1325/peopleChat-api/contents/database/${user}.json`;

  try {
    const config = {
      headers: {
        'User-Agent': 'PenguinMod-Auth-Server'
      }
    };
    
    // Attach authorization header if token exists
    if (TOKEN) {
      config.headers['Authorization'] = `token ${TOKEN}`;
    }

    const ghRes = await axios.get(url, config);
    
    // Parse the Base64 file contents safely
    const content = Buffer.from(ghRes.data.content, 'base64').toString('utf-8');
    res.json(JSON.parse(content));

  } catch (e) {
    if (e.response) {
      // Handles clear response errors coming straight from GitHub
      if (e.response.status === 404) {
        return res.status(404).json({ error: 'USER_NOT_FOUND' });
      }
      return res.status(e.response.status).json({ 
        error: `GitHub API Error: ${e.response.status}`, 
        details: e.response.data 
      });
    }
    // Generic catchall fallback if the network route itself drops
    res.status(500).json({ error: `Connection failed: ${e.message}` });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, hash } = req.body;
  const user = String(username).toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (!user || !hash) return res.status(400).json({ error: 'Missing data' });
  const url = `https://github.com/skyler1325/peopleChat-api/contents/database/${user}.json`;

  const config = {
    headers: {
      'User-Agent': 'PenguinMod-Auth-Server'
    }
  };
  
  if (TOKEN) {
    config.headers['Authorization'] = `token ${TOKEN}`;
  }

  try {
    // Check if the user profile exists
    await axios.get(url, config);
    return res.status(409).json({ error: 'EXISTS' });
  } catch (e) {
    // If it returns a 404, the username is available! Proceed to write.
    if (e.response && e.response.status === 404) {
      const body = {
        message: `New User: ${user}`,
        content: Buffer.from(JSON.stringify({ passwordHash: hash })).toString('base64')
      };

      try {
        await axios.put(url, body, config);
        return res.json({ success: true });
      } catch (writeErr) {
        return res.status(500).json({ 
          error: 'Failed to write user to database structure.',
          details: writeErr.response ? writeErr.response.data : writeErr.message
        });
      }
    }
    
    res.status(500).json({ error: 'Database check failed completely.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Secure server running stable on port ${PORT}`));
