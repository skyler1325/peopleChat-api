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
    const config = {
      headers: {
        'User-Agent': 'PenguinMod-Auth-Server'
      }
    };
    
    if (process.env.GH_TOKEN) {
      config.headers['Authorization'] = 'token ' + process.env.GH_TOKEN;
    }

    const ghRes = await axios.get(
      'https://github.com/skyler1325/peopleChat-server/database/' + 
      req.params.username.toLowerCase().replace(/[^a-z0-9]/g, '') + 
      '.json', 
      config
    );
    
    res.json(JSON.parse(Buffer.from(ghRes.data.content, 'base64').toString('utf-8')));

  } catch (e) {
    if (e.response) {
      if (e.response.status === 404) {
        return res.status(404).json({ error: 'USER_NOT_FOUND' });
      }
      return res.status(e.response.status).json({ 
        error: 'GitHub API Error: ' + e.response.status, 
        details: e.response.data 
      });
    }
    res.status(500).json({ error: 'Connection failed: ' + e.message });
  }
});

app.post('/api/register', async (req, res) => {
  if (!req.body.username || !req.body.hash) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const config = {
    headers: {
      'User-Agent': 'PenguinMod-Auth-Server'
    }
  };
  
  if (process.env.GH_TOKEN) {
    config.headers['Authorization'] = 'token ' + process.env.GH_TOKEN;
  }

  const targetUrl = 'https://github.com/peopleChat-server/database/' + 
                    String(req.body.username).toLowerCase().replace(/[^a-z0-9]/g, '') + 
                    '.json';

  try {
    await axios.get(targetUrl, config);
    return res.status(409).json({ error: 'EXISTS' });
  } catch (e) {
    if (e.response && e.response.status === 404) {
      try {
        await axios.put(
          targetUrl, 
          {
            message: 'New User: ' + String(req.body.username).toLowerCase().replace(/[^a-z0-9]/g, ''),
            content: Buffer.from(JSON.stringify({ passwordHash: String(req.body.hash) })).toString('base64')
          }, 
          config
        );
        return res.json({ success: true });
      } catch (writeErr) {
        return res.status(500).json({ 
          error: 'Failed to write user to database structure.',
          details: writeErr.response ? writeErr.writeErr.response.data : writeErr.message
        });
      }
    }
    res.status(500).json({ error: 'Database check failed completely.' });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Secure server running stable'));
