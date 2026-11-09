// API Service for Flowflix Anime
// Handles intelligent proxy routing, token caching, pagination, and multi-category exploration.

const DEFAULT_DIRECT_API = 'https://api.hentaihaven.app/v1';

const DEVICE_BODY = new URLSearchParams({
  sdkInt: '33',
  board: 'goldfish_x86_64',
  brand: 'google',
  display: 'sdk_gphone_x86_64-userdebug 13 TE1A.220922.028 10190541 dev-keys',
  fingerprint: 'google/sdk_gphone_x86_64/emu64xa:13/TE1A.220922.028/10190541:userdebug/dev-keys',
  manufacturer: 'Google',
  model: 'sdk_gphone_x86_64'
});

class ApiService {
  constructor() {
    this.storageKey = 'flowflix_api_gateway';
    const isWebOrigin = window.location.origin && window.location.origin.startsWith('http');
    const savedGateway = localStorage.getItem(this.storageKey);

    if (savedGateway) {
      this.baseUrl = savedGateway;
    } else if (isWebOrigin) {
      // If running on a dev server on another port (e.g. 5500, 8080), route to port 3000 proxy
      if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port && window.location.port !== '3000') {
        this.baseUrl = `http://${window.location.hostname}:3000/api`;
      } else {
        this.baseUrl = '/api';
      }
    } else {
      this.baseUrl = DEFAULT_DIRECT_API;
    }

    this.wardenToken = null;
    this.tokenExpiry = 0;
    this.cachedHome = null;
    this.cacheTimestamp = 0;
    this.isProxyMode = this.baseUrl.startsWith('/') || this.baseUrl.includes('localhost') || !this.baseUrl.includes('api.hentaihaven.app');
  }

  setGateway(url) {
    if (!url) url = '/api';
    this.baseUrl = url.replace(/\/+$/, '');
    localStorage.setItem(this.storageKey, this.baseUrl);
    this.isProxyMode = this.baseUrl.startsWith('/') || this.baseUrl.includes('localhost') || !this.baseUrl.includes('api.hentaihaven.app');
    this.wardenToken = null;
    this.tokenExpiry = 0;
    this.cachedHome = null;
  }

  getGateway() {
    return this.baseUrl;
  }

  async checkHealth() {
    try {
      if (this.isProxyMode) {
        const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            return { ok: true, mode: 'proxy', details: data };
          } catch (e) {
            return { ok: false, error: 'Proxy returned HTML instead of JSON. Cloudflare Functions may still be deploying.', mode: 'proxy' };
          }
        }
      }
      const token = await this.getToken();
      return { ok: !!token, mode: this.isProxyMode ? 'proxy' : 'direct', details: { hasToken: !!token } };
    } catch (err) {
      return { ok: false, error: err.message, mode: this.isProxyMode ? 'proxy' : 'direct' };
    }
  }

  async getToken(force = false) {
    const now = Math.floor(Date.now() / 1000);
    if (!force && this.wardenToken && now < this.tokenExpiry - 60) {
      return this.wardenToken;
    }

    const wardenUrl = `${this.baseUrl}/warden`;

    try {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
      };
      
      try {
        headers['User-Agent'] = 'HH_xxx_APP';
      } catch (e) {}

      const res = await fetch(wardenUrl, {
        method: 'POST',
        headers,
        body: DEVICE_BODY
      });

      if (!res.ok) {
        throw new Error(`Token fetch returned status ${res.status}`);
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (this.isProxyMode) {
          return 'proxy-managed';
        }
        throw new Error('Invalid token response format');
      }

      if (!data || !data.data || !data.data.token) {
        throw new Error(data?.data || 'Invalid token structure');
      }

      this.wardenToken = data.data.token;
      this.tokenExpiry = data.data.expiration || (now + 3600);
      return this.wardenToken;
    } catch (err) {
      if (this.isProxyMode) {
        return 'proxy-managed';
      }
      throw err;
    }
  }

  async fetch(path, options = {}) {
    let token = null;
    try {
      token = await this.getToken();
    } catch (e) {
      console.warn('Warden pre-fetch warning:', e);
    }

    const headers = {
      'Accept': 'application/json',
      ...(token && token !== 'proxy-managed' ? { 'warden': token } : {}),
      ...(options.headers || {})
    };

    const targetUrl = `${this.baseUrl}${path}`;

    try {
      const res = await fetch(targetUrl, {
        ...options,
        headers
      });

      if (res.status === 401 || res.status === 403) {
        console.log('Token expired, renewing...');
        const newToken = await this.getToken(true);
        if (newToken && newToken !== 'proxy-managed') {
          headers['warden'] = newToken;
        }
        const retryRes = await fetch(targetUrl, {
          ...options,
          headers
        });
        if (!retryRes.ok) throw new Error(`API error ${retryRes.status}`);
        const retryText = await retryRes.text();
        return JSON.parse(retryText);
      }

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        if (text.trim().startsWith('<') || text.includes('<!DOCTYPE')) {
          throw new Error('API gateway returned HTML instead of JSON. Cloudflare Pages Functions are building/deploying. Please allow 1-2 minutes for the deployment or verify gateway settings.');
        }
        throw new Error(`Malformed JSON response: ${jsonErr.message}`);
      }
      return data;
    } catch (err) {
      console.error(`Request to ${path} failed:`, err);
      throw err;
    }
  }

  // Endpoints
  async getHome(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cachedHome && (now - this.cacheTimestamp < 5 * 60 * 1000)) {
      return this.cachedHome;
    }

    const res = await this.fetch('/hentai/home');
    if (!res || !res.data || typeof res.data !== 'object') {
      res.data = {};
    }
    this.cachedHome = res;
    this.cacheTimestamp = now;
    return res;
  }

  async search(query, page = 1) {
    if (!query || !query.trim()) {
      return { success: true, data: [] };
    }
    try {
      const res = await this.fetch(`/search?q=${encodeURIComponent(query.trim())}&page=${page}`);
      // Defensive handling for API returning string messages when 0 results match
      if (!res || res.data === 'No results found' || res.data === 'Enter a search' || !Array.isArray(res.data)) {
        return { success: true, data: [] };
      }
      return res;
    } catch (e) {
      console.warn('Search query warning:', e);
      return { success: true, data: [] };
    }
  }

  async getSeries(id) {
    const res = await this.fetch(`/hentai/${id}`);
    if (!res || !res.data || typeof res.data === 'string' || res.success === false) {
      throw new Error(typeof res?.data === 'string' ? res.data : 'Series not found');
    }
    return res;
  }

  async getEpisode(seriesId, episodeId) {
    const res = await this.fetch(`/hentai/${seriesId}/episode/${episodeId}`);
    if (!res || !res.data || typeof res.data === 'string' || res.success === false) {
      throw new Error(typeof res?.data === 'string' ? res.data : 'Episode stream not found');
    }
    return res;
  }
}

const API = new ApiService();
