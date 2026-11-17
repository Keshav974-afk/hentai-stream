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

// Pre-seeded verified TMDB matches for known popular & broken titles
const PRE_SEEDED_TMDB = {
  'my mother': {
    id: 306351,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/ykl9Iy90TO8Prtq7fZxDTjYKbK0.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/4PNKx9x5yLDDvpAjc2YjHtuh1rR.jpg'
  },
  'fault': {
    id: 68704,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/omdsg4O13UMMGpc3Lqwqg9broB0.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/nv5ZGZ5vOijzSZ9jsN64kmAbQcH.jpg'
  },
  'first love': {
    id: 98017,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/wCUq0cFd7Yy2qptBU5ET2rnf5cR.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/KpD9vKO2Hm6J1dJFoU4MIWPleG.jpg'
  },
  'yokorenbo': {
    id: 97578,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/yowFlXKMFiPIXn1LLLNxQszDWrM.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/bUeXSyF1ac2FGyu1myUZxSzbOUC.jpg'
  },
  'taboo charming mother': {
    id: 74717,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/9HOrb2cziw00ImYw84raUX9f0Nd.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/81a7olfaCTjhKznpM0NQt2jSsxA.jpg'
  },
  'mother knows breast': {
    id: 97435,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/ajowYiyDV47v4pGUx3orp2LsPQf.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/1H6J6kl5JGvPTloV2qC1x5N81iQ.jpg'
  },
  'otome dori': {
    id: 93163,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/1FJmR86xTcAros7rQZU9sjqNsZu.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/u0VIOyhUm4mLdEXTDXKFXnMzxw8.jpg'
  },
  'kyonyuu fantasy': {
    id: 97284,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/pt0ttV381rUfjiS65m5DpyH3RqY.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/l2zufD0b5VIaFgQK0Ccd32iBj0Z.jpg'
  },
  'summer inaka': {
    id: 201109,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/k3m0ssAcejysq5gTrhSpXQAO0di.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/dZHJW4xLm8DgcTU1NtfR90i7gxy.jpg'
  },
  'ane wa yanmama': {
    id: 104602,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/t5hPL0gOoTyBFPvzdefPcqEeHx3.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/yKfIq2360UnAxlVpw7MqDGykIZs.jpg'
  },
  'hitori tsuma': {
    id: 330479,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/kYLH2w0ojtjJgnJZMr00GyMuzBL.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/jjHXGEaxGZ4bDt8osf9PtSrSimb.jpg'
  },
  'rennyuu tales': {
    id: 97839,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/p5vCCLEj5Aqn88w51FR9Zc9xi0B.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/of6PMGhEaFdx5yLzraxLjGaGmBk.jpg'
  },
  'stepmother': {
    id: 104363,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/kPcWG4J5RKdqcTDAmviv9hDn02M.jpg'
  },
  'gibo': {
    id: 104363,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/kPcWG4J5RKdqcTDAmviv9hDn02M.jpg'
  },
  'mouse cursor': {
    id: 334779,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/y3gE67auOFwfS4zLTFKu4VZvb1a.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/2YCsvsdWbbT9HT2EK4024JRSF5f.jpg'
  },
  'hitozukiai ga nigate': {
    id: 334504,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/dYJOSnFf9O9hDcTbSyZPQb5Xnb8.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/m99P4w0X0xNqIomcK7g5lK2U0b7.jpg'
  },
  'oushun jogakuen': {
    id: 337197,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/qxromWcA2F2D5Hy1QG68M5tWzQd.jpg'
  },
  'ntr kishi': {
    id: 326395,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/gBTscSOdFqQzpJGvazskNByaHV1.jpg'
  },
  'kanojo no tomodachi': {
    id: 336654,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/3DN0UnAUrLaY382mFdbv1wrVQNC.jpg'
  },
  'netorareta bakunyuu': {
    id: 292291,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/dZGvL06uj5KRpBGHLTkzdX9HW8Z.jpg'
  },
  'muramata san no aijou': {
    id: 337204,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/9pKZjOiJ7aaA4gMGkcXPJZELXY2.jpg'
  },
  'mujikaku na osananajimi': {
    id: 326790,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/wrqnMRBnh5L2BTTLYUBrkF1L1vh.jpg'
  },
  'pure x holic': {
    id: 323836,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/A3awMfTZJJag2OOxeP7g0WuAudy.jpg'
  },
  'sare tsuma wa ubawaretai': {
    id: 323604,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/1qmyS9zOskTN8sr5UnqlU0PsSNE.jpg'
  },
  'overflow': {
    id: 95897,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/uHIOTJXN9nNTc51WyunL43Fvge3.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/otEKvJA72Pue5RDgVrBqdOqgAd.jpg'
  },
  'imaizumin': {
    id: 133276,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/hcfYHAAL6hPlzOeM1tTNJkMguij.jpg'
  },
  'euphoria': {
    id: 112108,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/aJrG7OkoTMPWG5c8opz8a93AZPY.jpg'
  },
  'rance': {
    id: 104523,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/jF55pG9OL1j91atG96fAh5u9RFD.jpg'
  },
  'brandish': {
    id: 85107,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/5OKElp2HsHgQqDj4vwekTcdxrtW.jpg'
  }
};

function normalizeKey(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[~:!?,\-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTokens(str) {
  return (str || '').toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t && !['the', 'animation', 'ova', 'series', 'part', 'episode', 'season', 'tv', 'vol', 'volume', 'uncensored', 'chapter'].includes(t));
}

function matchSimilarity(target, candidate, isAdult) {
  const tToks = cleanTokens(target);
  const cToks = cleanTokens(candidate);
  if (!tToks.length || !cToks.length) return 0;

  const tSet = new Set(tToks);
  const cSet = new Set(cToks);

  let common = 0;
  for (const t of tToks) {
    if (cSet.has(t)) common++;
  }

  const recall = common / tToks.length;
  const precision = common / cToks.length;
  const f1 = (2 * precision * recall) / (precision + recall || 1);

  // If adult: false, strictly require high precision to prevent matching mainstream anime with extra words
  if (!isAdult && (precision < 0.75 || recall < 0.75)) {
    return 0;
  }
  return f1;
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

async function lookupTmdbServer(title, altTitle = '') {
  if (!title || typeof title !== 'string') return null;
  const norm = normalizeKey(title);
  const cacheKey = `title_${norm}`;

  if (tmdbServerCache.has(cacheKey)) {
    return tmdbServerCache.get(cacheKey);
  }

  // 1. Check pre-seeded verified library first (instant, guaranteed correct match)
  for (const [key, val] of Object.entries(PRE_SEEDED_TMDB)) {
    if (norm.includes(key) || key.includes(norm)) {
      const full = await lookupTmdbById(val.id, val.media_type || 'tv');
      if (full) {
        tmdbServerCache.set(cacheKey, full);
        return full;
      }
      const basic = {
        id: val.id,
        media_type: val.media_type || 'tv',
        name: title,
        poster: val.poster,
        backdrop: val.backdrop || null,
        episodes: []
      };
      tmdbServerCache.set(cacheKey, basic);
      return basic;
    }
  }

  // 2. Multi-tier query candidates
  const cleanTitle = title.replace(/\b(OVA|The Animation|Animation|Part|Episode|[0-9]+)\b/gi, '').trim();
  const queryCandidates = [
    title,
    title.toLowerCase().includes('animation') ? null : `${title} The Animation`,
    cleanTitle,
    altTitle
  ].filter((q, idx, arr) => q && q.length >= 2 && arr.indexOf(q) === idx);

  let bestMatch = null;
  let highestScore = -1;

  for (const q of queryCandidates) {
    const tvUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&include_adult=true`;
    const movieUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&include_adult=true`;

    const [tvRes, movieRes] = await Promise.all([
      fetchJson(tvUrl),
      fetchJson(movieUrl)
    ]);

    const candidates = [
      ...(tvRes?.results || []).map(r => ({ ...r, media_type: 'tv' })),
      ...(movieRes?.results || []).map(r => ({ ...r, media_type: 'movie' }))
    ];

    for (const r of candidates) {
      if (!r.poster_path && !r.backdrop_path) continue;

      const isAdult = !!r.adult;
      const isAnimation = Array.isArray(r.genre_ids) && r.genre_ids.includes(16);

      // STRICT MANDATORY RULE: Must be Animation (genre 16) OR adult Asian release.
      // Rejects live-action American/European films/shows (e.g. My Mother the Car, My Fault).
      if (!isAnimation && (!isAdult || !['ja', 'th', 'zh', 'ko'].includes(r.original_language))) {
        continue;
      }

      const candTitle = r.name || r.title || '';
      const sim = Math.max(
        matchSimilarity(title, candTitle, isAdult),
        altTitle ? matchSimilarity(altTitle, candTitle, isAdult) : 0,
        r.original_name ? matchSimilarity(title, r.original_name, isAdult) : 0
      );

      if (sim <= 0) continue;

      let score = sim * 100;
      if (isAdult) score += 40;
      if (isAnimation) score += 30;
      if (['ja', 'th', 'zh', 'ko'].includes(r.original_language)) score += 20;
      if (r.media_type === 'tv') score += 10;

      if (score > highestScore) {
        highestScore = score;
        bestMatch = { id: r.id, media_type: r.media_type, score: Math.round(score) };
      }
    }

    if (highestScore >= 160) break;
  }

  // Accept only if high confidence score (>= 120)
  if (bestMatch && highestScore >= 120) {
    const full = await lookupTmdbById(bestMatch.id, bestMatch.media_type);
    if (full) {
      tmdbServerCache.set(cacheKey, full);
      return full;
    }
  }

  // No verified anime match found. Cache null so original API poster is preserved safely.
  tmdbServerCache.set(cacheKey, null);
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
    const alt = searchParams.get('alt') || '';
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
        match = await lookupTmdbServer(title, alt);
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
