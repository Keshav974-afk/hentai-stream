// Vercel Serverless Function Proxy for Hentai Stream
const https = require('https');

const API_BASE = 'https://api.hentaihaven.app/v1';

const DEVICE_BODY = new URLSearchParams({
  sdkInt: '33',
  board: 'goldfish_x86_64',
  brand: 'google',
  display: 'sdk_gphone_x86_64-userdebug 13 TE1A.220922.028 10190541 dev-keys',
  fingerprint: 'google/sdk_gphone_x86_64/emu64xa:13/TE1A.220922.028/10190541:userdebug/dev-keys',
  manufacturer: 'Google',
  model: 'sdk_gphone_x86_64'
}).toString();

let cachedToken = null;
let tokenExpiresAt = 0;

function fetchWardenToken(force = false) {
  return new Promise((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000);
    if (!force && cachedToken && now < tokenExpiresAt - 60) {
      return resolve(cachedToken);
    }

    const req = https.request(`${API_BASE}/warden`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'User-Agent': 'HH_xxx_APP',
        'Content-Length': Buffer.byteLength(DEVICE_BODY)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.data && parsed.data.token) {
            cachedToken = parsed.data.token;
            tokenExpiresAt = parsed.data.expiration || (now + 3600);
            resolve(cachedToken);
          } else {
            reject(new Error(parsed.data || 'Failed to parse token'));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(DEVICE_BODY);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Extract path following /api/
  let subPath = req.url.replace(/^\/api/, '');
  if (!subPath || subPath === '/') {
    return res.status(200).json({ status: 'ok', name: 'Hentai Stream API Proxy' });
  }

  if (subPath.startsWith('/health')) {
    try {
      const token = await fetchWardenToken();
      return res.status(200).json({ status: 'ok', connected: true, hasToken: !!token });
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message });
    }
  }

  if (subPath.startsWith('/warden')) {
    try {
      const token = await fetchWardenToken(true);
      return res.status(200).json({ success: true, data: { token, expiration: tokenExpiresAt } });
    } catch (e) {
      return res.status(502).json({ success: false, error: e.message });
    }
  }

  try {
    const token = req.headers['warden'] || await fetchWardenToken();
    const fullApiPath = `${API_BASE}${subPath}`;

    const proxyReq = https.request(fullApiPath, {
      method: req.method,
      headers: {
        'User-Agent': 'HH_xxx_APP',
        'warden': token,
        'Accept': 'application/json'
      }
    }, (proxyRes) => {
      // Normalize search responses when no results match
      if (subPath.startsWith('/search')) {
        let body = '';
        proxyRes.on('data', chunk => body += chunk);
        proxyRes.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed && (parsed.data === 'No results found' || parsed.data === 'Enter a search')) {
              parsed.success = true;
              parsed.data = [];
              return res.status(200).json(parsed);
            }
          } catch (e) {}
          res.status(proxyRes.statusCode);
          res.setHeader('Content-Type', 'application/json');
          res.end(body);
        });
        return;
      }

      res.status(proxyRes.statusCode);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.status(502).json({ error: err.message });
    });

    if (req.method === 'POST' || req.method === 'PUT') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
