// API Service for HentaiHaven
const API_BASE = 'https://api.hentaihaven.app/v1';

let wardenToken = null;
let tokenExpiry = 0;

const DEVICE_BODY = new URLSearchParams({
  sdkInt: '33',
  board: 'goldfish_x86_64',
  brand: 'google',
  display: 'sdk_gphone_x86_64-userdebug 13 TE1A.220922.028 10190541 dev-keys',
  fingerprint: 'google/sdk_gphone_x86_64/emu64xa:13/TE1A.220922.028/10190541:userdebug/dev-keys',
  manufacturer: 'Google',
  model: 'sdk_gphone_x86_64'
});

async function getToken(force = false) {
  const now = Math.floor(Date.now() / 1000);
  if (!force && wardenToken && now < tokenExpiry - 60) {
    return wardenToken;
  }

  try {
    const res = await fetch(`${API_BASE}/warden`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'User-Agent': 'HH_xxx_APP'
      },
      body: DEVICE_BODY
    });

    if (!res.ok) throw new Error('Failed to get token');

    const data = await res.json();
    wardenToken = data.data.token;
    tokenExpiry = data.data.expiration || (now + 3600);
    console.log('Token obtained, expires at', new Date(tokenExpiry * 1000).toLocaleString());
    return wardenToken;
  } catch (err) {
    console.error('Token error:', err);
    throw err;
  }
}

async function apiFetch(path, options = {}) {
  const token = await getToken();
  
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'User-Agent': 'HH_xxx_APP',
      'warden': token,
      ...(options.headers || {})
    }
  });

  if (res.status === 401 || res.status === 403) {
    // Token expired → refresh and retry once
    await getToken(true);
    return apiFetch(path, options);
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }

  return res.json();
}

// Public API methods
const API = {
  async getHome() {
    return apiFetch('/hentai/home');
  },

  async search(query) {
    return apiFetch(`/search?q=${encodeURIComponent(query)}`);
  },

  async getSeries(id) {
    return apiFetch(`/hentai/${id}`);
  },

  async getEpisode(seriesId, episodeId) {
    return apiFetch(`/hentai/${seriesId}/episode/${episodeId}`);
  }
};
