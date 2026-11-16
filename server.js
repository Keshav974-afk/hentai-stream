// Zero-dependency Node.js server and API proxy for Hentai Stream
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import url, { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const TMDB_API_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const tmdbServerCache = new Map();

function cleanTitleForTmdb(title) {
  return (title || '')
    .replace(/\b(OVA|The Animation|Animation|Part|Episode|[0-9]+)\b/gi, '')
    .replace(/[~:!?,\-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function queryTmdb(query) {
  return new Promise((resolve) => {
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=true`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const match = parsed.results?.find(r => r.poster_path || r.backdrop_path);
          if (match) {
            resolve({
              id: match.id,
              name: match.name || match.title,
              poster: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null,
              backdrop: match.backdrop_path ? `https://image.tmdb.org/t/p/original${match.backdrop_path}` : null
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function lookupTmdbServer(title) {
  const norm = (title || '').toLowerCase().trim();
  if (tmdbServerCache.has(norm)) {
    return tmdbServerCache.get(norm);
  }

  const cleaned = cleanTitleForTmdb(title);
  const words = cleaned.split(' ').filter(Boolean);
  const candidates = [
    title,
    cleaned,
    words.slice(0, 4).join(' '),
    words.slice(0, 2).join(' ')
  ].filter((q, i, arr) => q && q.length >= 3 && arr.indexOf(q) === i);

  for (const q of candidates) {
    const match = await queryTmdb(q);
    if (match) {
      tmdbServerCache.set(norm, match);
      return match;
    }
  }

  tmdbServerCache.set(norm, null);
  return null;
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

  // Handle TMDB poster and backdrop lookup
  if (targetPath === '/tmdb' || targetPath.startsWith('/tmdb?')) {
    const searchParams = new URLSearchParams(parsedUrl.query || '');
    const title = searchParams.get('title') || '';
    if (!title) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Title is required' }));
    }
    try {
      const match = await lookupTmdbServer(title);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400'
      });
      return res.end(JSON.stringify({ success: true, found: !!match, data: match }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
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
          res.writeHead(proxyRes.statusCode, {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400'
          });
          res.end(body);
        });
        return;
      }

      const headers = { 'Content-Type': 'application/json' };
      if (req.method === 'GET' && proxyRes.statusCode === 200) {
        headers['Cache-Control'] = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400';
      }
      res.writeHead(proxyRes.statusCode, headers);
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
  const distDir = path.join(__dirname, 'dist');
  const baseDir = fs.existsSync(path.join(distDir, 'index.html')) ? distDir : __dirname;

  let normalizedPath = path.normalize(path.join(baseDir, filePath));
  if (!normalizedPath.startsWith(baseDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isDirectory()) {
    normalizedPath = path.join(normalizedPath, 'index.html');
  }

  // SPA Fallback: if file doesn't exist and request doesn't have an extension, serve index.html
  if (!fs.existsSync(normalizedPath) && !path.extname(normalizedPath)) {
    normalizedPath = path.join(baseDir, 'index.html');
  }

  fs.readFile(normalizedPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA client-side routing
        const spaIndex = path.join(baseDir, 'index.html');
        if (fs.existsSync(spaIndex)) {
          return fs.readFile(spaIndex, (spaErr, spaContent) => {
            if (spaErr) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              return res.end('404 Not Found');
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(spaContent);
          });
        }
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
