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

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function queryTmdb(query) {
  const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=true`;
  const parsed = await fetchJson(searchUrl);
  if (!parsed || !Array.isArray(parsed.results)) return null;

  const match = parsed.results.find(r => r.poster_path || r.backdrop_path);
  if (!match) return null;

  const id = match.id;
  const mediaType = match.media_type || (match.first_air_date ? 'tv' : 'movie');

  if (mediaType === 'tv') {
    const tvDetails = await fetchJson(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&append_to_response=season/1`);
    const season1Eps = tvDetails?.['season/1']?.episodes || [];
    const episodes = season1Eps.map(e => ({
      episode_number: e.episode_number,
      name: e.name || `Episode ${e.episode_number}`,
      overview: e.overview || '',
      still: e.still_path ? `https://image.tmdb.org/t/p/w500${e.still_path}` : null,
      air_date: e.air_date || '',
      runtime: e.runtime || null
    }));

    return {
      id,
      media_type: 'tv',
      name: tvDetails?.name || match.name || match.title,
      overview: tvDetails?.overview || match.overview || '',
      poster: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null,
      backdrop: (tvDetails?.backdrop_path || match.backdrop_path)
        ? `https://image.tmdb.org/t/p/original${tvDetails?.backdrop_path || match.backdrop_path}`
        : null,
      first_air_date: tvDetails?.first_air_date || match.first_air_date || '',
      vote_average: tvDetails?.vote_average || match.vote_average || 0,
      episodes
    };
  } else {
    const movieDetails = await fetchJson(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`);
    return {
      id,
      media_type: 'movie',
      name: movieDetails?.title || match.title || match.name,
      overview: movieDetails?.overview || match.overview || '',
      poster: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null,
      backdrop: (movieDetails?.backdrop_path || match.backdrop_path)
        ? `https://image.tmdb.org/t/p/original${movieDetails?.backdrop_path || match.backdrop_path}`
        : null,
      first_air_date: movieDetails?.release_date || match.release_date || '',
      vote_average: movieDetails?.vote_average || match.vote_average || 0,
      runtime: movieDetails?.runtime || null,
      episodes: []
    };
  }
}

async function lookupTmdbById(id, type = 'tv') {
  const cacheKey = `id_${type}_${id}`;
  if (tmdbServerCache.has(cacheKey)) {
    return tmdbServerCache.get(cacheKey);
  }

  if (type === 'tv') {
    const tv = await fetchJson(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&append_to_response=season/1`);
    if (!tv) return null;
    const season1Eps = tv['season/1']?.episodes || [];
    const episodes = season1Eps.map(e => ({
      episode_number: e.episode_number,
      name: e.name || `Episode ${e.episode_number}`,
      overview: e.overview || '',
      still: e.still_path ? `https://image.tmdb.org/t/p/w500${e.still_path}` : null,
      air_date: e.air_date || '',
      runtime: e.runtime || null
    }));

    const result = {
      id: tv.id,
      media_type: 'tv',
      name: tv.name,
      overview: tv.overview || '',
      poster: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : null,
      backdrop: tv.backdrop_path ? `https://image.tmdb.org/t/p/original${tv.backdrop_path}` : null,
      first_air_date: tv.first_air_date || '',
      vote_average: tv.vote_average || 0,
      episodes
    };
    tmdbServerCache.set(cacheKey, result);
    return result;
  } else {
    const movie = await fetchJson(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`);
    if (!movie) return null;
    const result = {
      id: movie.id,
      media_type: 'movie',
      name: movie.title,
      overview: movie.overview || '',
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
      first_air_date: movie.release_date || '',
      vote_average: movie.vote_average || 0,
      runtime: movie.runtime || null,
      episodes: []
    };
    tmdbServerCache.set(cacheKey, result);
    return result;
  }
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

  // Handle TMDB poster, backdrop, and episode lookup
  if (targetPath === '/tmdb' || targetPath.startsWith('/tmdb?')) {
    const searchParams = new URLSearchParams(parsedUrl.query || '');
    const title = searchParams.get('title') || '';
    const id = searchParams.get('id') || '';
    const type = searchParams.get('type') || 'tv';

    if (!title && !id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Title or id is required' }));
    }
    try {
      let match = null;
      if (id) {
        match = await lookupTmdbById(id, type);
      } else {
        match = await lookupTmdbServer(title);
      }
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
