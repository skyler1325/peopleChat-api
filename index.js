const express = require('express');
const cors = require('cors');

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

// ⚠️ CHANGE THIS to your exact username and your dummy chat storage repo
const REPO = "skyler1325/peopleChat-server"; 
const TOKEN = process.env.GH_TOKEN;

app.get('/api/user/:username', async (req, res) => {
  const user = req.params.username.toLowerCase().replace(/[^a-z0-9]/g, '');
  const url = `https://github.com{REPO}/contents/database/${user}.json`;

  try {
    const ghRes = await fetch(url, {
      headers: {
        'User-Agent': 'PenguinMod-Auth-Server'
      }
    });
    
    if (ghRes.status === 404) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }
    
    if (!ghRes.ok) {
      // This will pull the actual error message directly from GitHub (e.g. Bad credentials, repo not found)
      const errText = await ghRes.text();
      return res.status(ghRes.status).json({ error: `GitHub API Error: ${errText}` });
    }
    
    const data = await ghRes.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    res.json(JSON.parse(content));
  } catch (e) {
    res.status(500).json({ error: `Network/Server Fetch Error: ${e.message}` });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, hash } = req.body;
  const user = String(username).toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!user || !hash) return res.status(400).json({ error: 'Missing data' });
  const url = `https://github.com{REPO}/contents/database/${user}.json`;

  try {
    const check = await fetch(url);
    if (check.ok) return res.status(409).json({ error: 'EXISTS' });

    const body = {
      message: `New User: ${user}`,
      content: Buffer.from(JSON.stringify({ passwordHash: hash })).toString('base64')
    };

    const ghRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (ghRes.ok) res.json({ success: true });
    else res.status(500).json({ error: 'Failed to write' });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Render dynamically assigns a port, fallback to 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Secure server running on port ${PORT}`));
