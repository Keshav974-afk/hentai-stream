// Zero-dependency Node.js server and API proxy for Hentai Stream
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const API_BASE = 'https://api.hentaihaven.app/v1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.m3u8': 'application/vnd.apple.mpegurl'
};

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

// Fetch token server-side with the required User-Agent
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

// Proxy API requests to HentaiHaven API
async function handleApiProxy(req, res, targetPath, parsedUrl) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle healthcheck
  if (targetPath === '/health') {
    try {
      const token = await fetchWardenToken();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', connected: true, hasToken: !!token }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: e.message }));
    }
    return;
  }

  // Handle warden token request
  if (targetPath === '/warden') {
    try {
      const token = await fetchWardenToken(true);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { token, expiration: tokenExpiresAt } }));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // General API proxy
  try {
    let token = req.headers['warden'] || await fetchWardenToken();
    const query = parsedUrl.search || '';
    const fullApiPath = `${API_BASE}${targetPath}${query}`;

    const proxyReq = https.request(fullApiPath, {
      method: req.method,
      headers: {
        'User-Agent': 'HH_xxx_APP',
        'warden': token,
        'Accept': 'application/json'
      }
    }, (proxyRes) => {
      // Check for token expiration
      if (proxyRes.statusCode === 401 || proxyRes.statusCode === 403) {
        fetchWardenToken(true).then((newToken) => {
          const retryReq = https.request(fullApiPath, {
            method: req.method,
            headers: {
              'User-Agent': 'HH_xxx_APP',
              'warden': newToken,
              'Accept': 'application/json'
            }
          }, (retryRes) => {
            res.writeHead(retryRes.statusCode, { 'Content-Type': 'application/json' });
            retryRes.pipe(res);
          });
          retryReq.on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          });
          retryReq.end();
        }).catch(err => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });
        return;
      }

      // Normalize search responses when no results match
      if (targetPath.startsWith('/search')) {
        let body = '';
        proxyRes.on('data', chunk => body += chunk);
        proxyRes.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed && (parsed.data === 'No results found' || parsed.data === 'Enter a search')) {
              parsed.success = true;
              parsed.data = [];
              const normalized = JSON.stringify(parsed);
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(normalized)
              });
              return res.end(normalized);
            }
          } catch (e) {}
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(body);
        });
        return;
      }

      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gateway Error: ' + err.message }));
    });

    if (req.method === 'POST' || req.method === 'PUT') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// Serve static frontend files
function serveStatic(req, res, filePath) {
  let normalizedPath = path.normalize(path.join(__dirname, filePath));
  if (!normalizedPath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isDirectory()) {
    normalizedPath = path.join(normalizedPath, 'index.html');
  }

  fs.readFile(normalizedPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      }
      return;
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

// Main server handler
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith('/api/')) {
    const targetPath = pathname.slice(4); // strip '/api'
    handleApiProxy(req, res, targetPath, parsedUrl);
  } else {
    serveStatic(req, res, pathname === '/' ? 'index.html' : pathname);
  }
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`✨ Hentai Stream Server running at: http://localhost:${PORT}`);
  console.log(`📡 API Proxy active: http://localhost:${PORT}/api/*`);
  console.log(`=================================================\n`);
});
