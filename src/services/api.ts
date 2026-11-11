import { Episode, GenreTag, HentaiItem, HomeData } from '../types/api';

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
  private baseUrl: string;
  private wardenToken: string | null = null;
  private tokenExpiry = 0;
  private cachedHome: { data: HomeData } | null = null;
  private cacheTimestamp = 0;
  private isProxyMode: boolean;

  constructor() {
    const isWebOrigin = typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http');
    const savedGateway = typeof localStorage !== 'undefined' ? localStorage.getItem('flowflix_api_gateway') : null;

    if (savedGateway) {
      this.baseUrl = savedGateway;
    } else if (isWebOrigin) {
      if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port && window.location.port !== '3000') {
        this.baseUrl = `http://${window.location.hostname}:3000/api`;
      } else {
        this.baseUrl = '/api';
      }
    } else {
      this.baseUrl = DEFAULT_DIRECT_API;
    }

    this.isProxyMode = this.baseUrl.startsWith('/') || this.baseUrl.includes('localhost') || !this.baseUrl.includes('api.hentaihaven.app');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async getToken(force = false): Promise<string | null> {
    const now = Math.floor(Date.now() / 1000);
    if (!force && this.wardenToken && now < this.tokenExpiry - 60) {
      return this.wardenToken;
    }

    try {
      const res = await fetch(`${this.baseUrl}/warden`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
        },
        body: DEVICE_BODY
      });

      if (!res.ok) {
        if (this.isProxyMode) return 'proxy-managed';
        throw new Error(`Token fetch returned status ${res.status}`);
      }

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        if (this.isProxyMode) return 'proxy-managed';
        throw new Error('Invalid token response format');
      }

      if (data?.data?.token) {
        this.wardenToken = data.data.token;
        this.tokenExpiry = data.data.expiration || (now + 3600);
        return this.wardenToken;
      }

      if (this.isProxyMode) return 'proxy-managed';
      return null;
    } catch (err) {
      if (this.isProxyMode) return 'proxy-managed';
      throw err;
    }
  }

  public async fetchApi<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    let token: string | null = null;
    try {
      token = await this.getToken();
    } catch {
      // proxy fallback
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(token && token !== 'proxy-managed' ? { 'warden': token } : {}),
      ...((options.headers as Record<string, string>) || {})
    };

    const targetUrl = `${this.baseUrl}${path}`;

    try {
      const res = await fetch(targetUrl, {
        ...options,
        headers
      });

      if (res.status === 401 || res.status === 403) {
        const newToken = await this.getToken(true);
        if (newToken && newToken !== 'proxy-managed') {
          headers['warden'] = newToken;
        }
        const retryRes = await fetch(targetUrl, {
          ...options,
          headers
        });
        if (!retryRes.ok) throw new Error(`API error ${retryRes.status}`);
        return await retryRes.json();
      }

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (jsonErr: any) {
        if (text.trim().startsWith('<') || text.includes('<!DOCTYPE')) {
          throw new Error('API gateway returned HTML. Please allow 1 minute for cloud backend to warm up.');
        }
        throw new Error(`Malformed JSON response: ${jsonErr.message}`);
      }
    } catch (err) {
      console.error(`Request to ${path} failed:`, err);
      throw err;
    }
  }

  public async getHome(forceRefresh = false): Promise<HomeData> {
    const now = Date.now();
    if (!forceRefresh && this.cachedHome && (now - this.cacheTimestamp < 5 * 60 * 1000)) {
      return this.cachedHome.data;
    }

    const res = await this.fetchApi<{ success: boolean; data: HomeData }>('/hentai/home');
    const data = res?.data || {};
    this.cachedHome = { data };
    this.cacheTimestamp = now;
    return data;
  }

  public async search(query: string, pageOrOffset: number = 0): Promise<HentaiItem[]> {
    if (!query || !query.trim()) {
      return [];
    }
    const offset = typeof pageOrOffset === 'number' && pageOrOffset >= 20 && pageOrOffset % 20 === 0
      ? pageOrOffset
      : Math.max(0, ((Number(pageOrOffset) || 1) - 1) * 20);
    const pageNum = Math.floor(offset / 20) + 1;

    try {
      const res = await this.fetchApi<{ success: boolean; data: any }>(
        `/search?q=${encodeURIComponent(query.trim())}&offset=${offset}&page=${pageNum}`
      );
      if (!res || res.data === 'No results found' || res.data === 'Enter a search' || !Array.isArray(res.data)) {
        return [];
      }
      return res.data;
    } catch (e) {
      console.warn('Search query warning:', e);
      return [];
    }
  }

  public async getSeries(id: string | number): Promise<HentaiItem> {
    const res = await this.fetchApi<{ success: boolean; data: HentaiItem }>(`/hentai/${id}`);
    if (!res || !res.data || typeof res.data === 'string' || res.success === false) {
      throw new Error(typeof res?.data === 'string' ? res.data : 'Series not found');
    }
    return res.data;
  }

  public async getEpisode(seriesId: string | number, episodeId: string | number): Promise<Episode> {
    const res = await this.fetchApi<{ success: boolean; data: Episode }>(
      `/hentai/${seriesId}/episode/${episodeId}`
    );
    if (!res || !res.data || typeof res.data === 'string' || res.success === false) {
      throw new Error(typeof res?.data === 'string' ? res.data : 'Episode stream not found');
    }
    return res.data;
  }

  public async getGenres(): Promise<GenreTag[]> {
    try {
      const res = await this.fetchApi<{ success: boolean; data: GenreTag[] }>('/genre/all');
      if (!res || !Array.isArray(res.data)) {
        return [];
      }
      return res.data;
    } catch {
      return [];
    }
  }

  public async getGenreTitles(termId: number | string, page: number = 1): Promise<{ term: GenreTag | null; hentais: HentaiItem[] }> {
    try {
      const res = await this.fetchApi<{ success: boolean; data: { term: GenreTag | null; hentais: HentaiItem[] } }>(
        `/genre/${termId}?p=${page}`
      );
      if (!res || !res.data || res.success === false || typeof res.data === 'string') {
        return { term: null, hentais: [] };
      }
      return {
        term: res.data.term || null,
        hentais: Array.isArray(res.data.hentais) ? res.data.hentais : []
      };
    } catch (e) {
      console.warn('Genre titles fetch error:', e);
      return { term: null, hentais: [] };
    }
  }
}

export const API = new ApiService();
