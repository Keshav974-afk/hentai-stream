// TMDB Poster, Backdrop & Episode Enrichment Service
// Integrates The Movie Database (TMDB) API to fetch high-resolution posters, backdrops, and episode stills

export interface TmdbEpisodeInfo {
  episode_number: number;
  name: string;
  overview: string;
  still: string | null;
  air_date?: string;
  runtime?: number | null;
}

export interface TmdbMediaInfo {
  id: number;
  media_type: 'tv' | 'movie';
  name: string;
  overview?: string;
  poster: string | null;
  backdrop: string | null;
  first_air_date?: string;
  vote_average?: number;
  episodes?: TmdbEpisodeInfo[];
}

const TMDB_API_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Pre-seeded verified TMDB matches for known popular & broken titles
const PRE_SEEDED_TMDB: Record<string, { id: number; media_type?: 'tv' | 'movie'; poster: string; backdrop?: string }> = {
  // My Mother
  'my mother': {
    id: 306351,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/ykl9Iy90TO8Prtq7fZxDTjYKbK0.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/4PNKx9x5yLDDvpAjc2YjHtuh1rR.jpg'
  },
  // Fault!!
  'fault': {
    id: 68704,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/omdsg4O13UMMGpc3Lqwqg9broB0.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/nv5ZGZ5vOijzSZ9jsN64kmAbQcH.jpg'
  },
  // First Love
  'first love': {
    id: 98017,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/wCUq0cFd7Yy2qptBU5ET2rnf5cR.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/KpD9vKO2Hm6J1dJFoU4MIWPleG.jpg'
  },
  // Yokorenbo
  'yokorenbo': {
    id: 97578,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/yowFlXKMFiPIXn1LLLNxQszDWrM.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/bUeXSyF1ac2FGyu1myUZxSzbOUC.jpg'
  },
  // Taboo Charming Mother
  'taboo charming mother': {
    id: 74717,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/9HOrb2cziw00ImYw84raUX9f0Nd.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/81a7olfaCTjhKznpM0NQt2jSsxA.jpg'
  },
  // Mother Knows Breast
  'mother knows breast': {
    id: 97435,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/ajowYiyDV47v4pGUx3orp2LsPQf.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/1H6J6kl5JGvPTloV2qC1x5N81iQ.jpg'
  },
  // Otome Dori
  'otome dori': {
    id: 93163,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/1FJmR86xTcAros7rQZU9sjqNsZu.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/u0VIOyhUm4mLdEXTDXKFXnMzxw8.jpg'
  },
  // Kyonyuu Fantasy
  'kyonyuu fantasy': {
    id: 97284,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/pt0ttV381rUfjiS65m5DpyH3RqY.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/l2zufD0b5VIaFgQK0Ccd32iBj0Z.jpg'
  },
  // Summer Inaka no Seikatsu
  'summer inaka': {
    id: 201109,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/k3m0ssAcejysq5gTrhSpXQAO0di.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/dZHJW4xLm8DgcTU1NtfR90i7gxy.jpg'
  },
  // Ane wa Yanmama Junyuu-chuu
  'ane wa yanmama': {
    id: 104602,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/t5hPL0gOoTyBFPvzdefPcqEeHx3.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/yKfIq2360UnAxlVpw7MqDGykIZs.jpg'
  },
  // Hitori Tsuma
  'hitori tsuma': {
    id: 330479,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/kYLH2w0ojtjJgnJZMr00GyMuzBL.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/jjHXGEaxGZ4bDt8osf9PtSrSimb.jpg'
  },
  // Rennyuu Tales
  'rennyuu tales': {
    id: 97839,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/p5vCCLEj5Aqn88w51FR9Zc9xi0B.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/of6PMGhEaFdx5yLzraxLjGaGmBk.jpg'
  },
  // Stepmother's Sin (Gibo)
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
  // Mouse Cursor
  'mouse cursor': {
    id: 334779,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/y3gE67auOFwfS4zLTFKu4VZvb1a.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/2YCsvsdWbbT9HT2EK4024JRSF5f.jpg'
  },
  'mouse cursor de genjitsu': {
    id: 334779,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/y3gE67auOFwfS4zLTFKu4VZvb1a.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/2YCsvsdWbbT9HT2EK4024JRSF5f.jpg'
  },
  // Hitozukiai ga Nigate
  'hitozukiai ga nigate': {
    id: 334504,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/dYJOSnFf9O9hDcTbSyZPQb5Xnb8.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/m99P4w0X0xNqIomcK7g5lK2U0b7.jpg'
  },
  // Oushun Jogakuen
  'oushun jogakuen': {
    id: 337197,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/qxromWcA2F2D5Hy1QG68M5tWzQd.jpg'
  },
  // NTR Kishi
  'ntr kishi': {
    id: 326395,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/gBTscSOdFqQzpJGvazskNByaHV1.jpg'
  },
  // Kanojo no Tomodachi
  'kanojo no tomodachi': {
    id: 336654,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/3DN0UnAUrLaY382mFdbv1wrVQNC.jpg'
  },
  // Netorareta Bakunyuu Tsuma-tachi
  'netorareta bakunyuu': {
    id: 292291,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/dZGvL06uj5KRpBGHLTkzdX9HW8Z.jpg'
  },
  // Muramata-san no Aijou
  'muramata san no aijou': {
    id: 337204,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/9pKZjOiJ7aaA4gMGkcXPJZELXY2.jpg'
  },
  // Mujikaku na Osananajimi
  'mujikaku na osananajimi': {
    id: 326790,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/wrqnMRBnh5L2BTTLYUBrkF1L1vh.jpg'
  },
  // Pure x Holic
  'pure x holic': {
    id: 323836,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/A3awMfTZJJag2OOxeP7g0WuAudy.jpg'
  },
  // Sare Tsuma wa Ubawaretai
  'sare tsuma wa ubawaretai': {
    id: 323604,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/1qmyS9zOskTN8sr5UnqlU0PsSNE.jpg'
  },
  // Overflow
  'overflow': {
    id: 95897,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/uHIOTJXN9nNTc51WyunL43Fvge3.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/otEKvJA72Pue5RDgVrBqdOqgAd.jpg'
  },
  // Imaizumin-chi
  'imaizumin': {
    id: 133276,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/hcfYHAAL6hPlzOeM1tTNJkMguij.jpg'
  },
  // Euphoria
  'euphoria': {
    id: 112108,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/aJrG7OkoTMPWG5c8opz8a93AZPY.jpg'
  },
  // Rance
  'rance': {
    id: 104523,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/jF55pG9OL1j91atG96fAh5u9RFD.jpg'
  },
  // Brandish
  'brandish': {
    id: 85107,
    media_type: 'tv',
    poster: 'https://image.tmdb.org/t/p/w500/5OKElp2HsHgQqDj4vwekTcdxrtW.jpg'
  }
};

function cleanTokens(str: string): string[] {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !['the', 'animation', 'ova', 'series', 'part', 'episode', 'season', 'tv', 'vol', 'volume', 'uncensored', 'chapter'].includes(t));
}

function matchSimilarity(target: string, candidate: string, isAdult: boolean): number {
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

class TmdbService {
  private cache = new Map<string, TmdbMediaInfo | null>();
  private inflight = new Map<string, Promise<TmdbMediaInfo | null>>();

  constructor() {
    // Purge legacy v1 TMDB caches that might have stored live-action false positives (e.g. My Mother the Car)
    if (typeof localStorage !== 'undefined') {
      try {
        const toDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('tmdb_media_') || k.startsWith('tmdb_details_'))) {
            toDelete.push(k);
          }
        }
        toDelete.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  }

  private normalizeKey(title: string): string {
    return (title || '')
      .toLowerCase()
      .replace(/[~:!?,\-_.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanTitleForSearch(title: string): string {
    return (title || '')
      .replace(/\b(OVA|The Animation|Animation|Part|Episode|[0-9]+)\b/gi, '')
      .replace(/[~:!?,\-_.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public getPreSeeded(title: string): TmdbMediaInfo | null {
    const norm = this.normalizeKey(title);
    for (const [key, val] of Object.entries(PRE_SEEDED_TMDB)) {
      if (norm.includes(key) || key.includes(norm)) {
        return {
          id: val.id,
          media_type: val.media_type || 'tv',
          name: title,
          poster: val.poster,
          backdrop: val.backdrop || null,
          episodes: []
        };
      }
    }
    return null;
  }

  /**
   * Fetch full details for a known TMDB series (including season 1 episodes)
   */
  public async getSeriesDetails(id: number, type: 'tv' | 'movie' = 'tv'): Promise<TmdbMediaInfo | null> {
    const cacheKey = `id_${type}_${id}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`tmdb_v2_details_${cacheKey}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.cache.set(cacheKey, parsed);
          return parsed;
        }
      } catch {}
    }

    try {
      // Try local proxy first
      try {
        const proxyRes = await fetch(`/api/tmdb?id=${id}&type=${type}`);
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json && json.success && json.data) {
            this.cache.set(cacheKey, json.data);
            if (typeof localStorage !== 'undefined') {
              try {
                localStorage.setItem(`tmdb_v2_details_${cacheKey}`, JSON.stringify(json.data));
              } catch {}
            }
            return json.data;
          }
        }
      } catch {}

      // Fallback direct TMDB API
      if (type === 'tv') {
        const directUrl = `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&append_to_response=season/1`;
        const res = await fetch(directUrl);
        if (res.ok) {
          const tv = await res.json();
          const season1Eps = tv['season/1']?.episodes || [];
          const episodes: TmdbEpisodeInfo[] = season1Eps.map((e: any) => ({
            episode_number: e.episode_number,
            name: e.name || `Episode ${e.episode_number}`,
            overview: e.overview || '',
            still: e.still_path ? `${TMDB_IMAGE_BASE}/w500${e.still_path}` : null,
            air_date: e.air_date || '',
            runtime: e.runtime || null
          }));

          const result: TmdbMediaInfo = {
            id: tv.id,
            media_type: 'tv',
            name: tv.name,
            overview: tv.overview || '',
            poster: tv.poster_path ? `${TMDB_IMAGE_BASE}/w500${tv.poster_path}` : null,
            backdrop: tv.backdrop_path ? `${TMDB_IMAGE_BASE}/original${tv.backdrop_path}` : null,
            first_air_date: tv.first_air_date || '',
            vote_average: tv.vote_average || 0,
            episodes
          };

          this.cache.set(cacheKey, result);
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem(`tmdb_v2_details_${cacheKey}`, JSON.stringify(result));
            } catch {}
          }
          return result;
        }
      } else {
        const movieUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`;
        const res = await fetch(movieUrl);
        if (res.ok) {
          const movie = await res.json();
          const result: TmdbMediaInfo = {
            id: movie.id,
            media_type: 'movie',
            name: movie.title,
            overview: movie.overview || '',
            poster: movie.poster_path ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}` : null,
            backdrop: movie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${movie.backdrop_path}` : null,
            first_air_date: movie.release_date || '',
            vote_average: movie.vote_average || 0,
            episodes: []
          };
          this.cache.set(cacheKey, result);
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem(`tmdb_v2_details_${cacheKey}`, JSON.stringify(result));
            } catch {}
          }
          return result;
        }
      }
    } catch {}

    return null;
  }

  /**
   * Look up TMDB by anime title.
   * If withEpisodes is true, ensures full episode data is attached.
   */
  public async lookup(title: string, withEpisodes: boolean = false, altTitle: string = ''): Promise<TmdbMediaInfo | null> {
    if (!title || typeof title !== 'string') return null;

    const key = this.normalizeKey(title);
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (cached) {
        if (withEpisodes && (!cached.episodes || cached.episodes.length === 0)) {
          const full = await this.getSeriesDetails(cached.id, cached.media_type);
          if (full && full.episodes && full.episodes.length > 0) {
            cached.episodes = full.episodes;
            if (!cached.overview && full.overview) cached.overview = full.overview;
            if (!cached.backdrop && full.backdrop) cached.backdrop = full.backdrop;
            this.cache.set(key, cached);
          }
        }
        return cached;
      }
      return null;
    }

    // Check pre-seeded matches first (instant zero-latency hit)
    const preSeeded = this.getPreSeeded(title);
    if (preSeeded) {
      if (withEpisodes) {
        const full = await this.getSeriesDetails(preSeeded.id, preSeeded.media_type);
        if (full) {
          if (full.episodes) preSeeded.episodes = full.episodes;
          if (full.overview) preSeeded.overview = full.overview;
          if (full.backdrop) preSeeded.backdrop = full.backdrop;
        }
      }
      this.cache.set(key, preSeeded);
      return preSeeded;
    }

    // Check localStorage cache (v2)
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`tmdb_v2_media_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (withEpisodes && (!parsed.episodes || parsed.episodes.length === 0)) {
            const full = await this.getSeriesDetails(parsed.id, parsed.media_type || 'tv');
            if (full && full.episodes) {
              parsed.episodes = full.episodes;
              if (full.overview) parsed.overview = full.overview;
              if (full.backdrop) parsed.backdrop = full.backdrop;
            }
          }
          this.cache.set(key, parsed);
          return parsed;
        }
      } catch {}
    }

    // Deduplicate concurrent inflight requests
    if (this.inflight.has(key)) {
      const existing = await this.inflight.get(key)!;
      if (existing && withEpisodes && (!existing.episodes || existing.episodes.length === 0)) {
        const full = await this.getSeriesDetails(existing.id, existing.media_type || 'tv');
        if (full?.episodes) existing.episodes = full.episodes;
      }
      return existing;
    }

    const promise = this.executeSearch(title, altTitle, key, withEpisodes);
    this.inflight.set(key, promise);
    try {
      const result = await promise;
      return result;
    } finally {
      this.inflight.delete(key);
    }
  }

  private async executeSearch(rawTitle: string, altTitle: string, cacheKey: string, withEpisodes: boolean): Promise<TmdbMediaInfo | null> {
    // 1. Try local proxy endpoint first with alt title support
    try {
      const url = `/api/tmdb?title=${encodeURIComponent(rawTitle)}${altTitle ? `&alt=${encodeURIComponent(altTitle)}` : ''}`;
      const proxyRes = await fetch(url);
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json && json.success) {
          if (json.data && json.data.id) {
            const result: TmdbMediaInfo = json.data;
            if (withEpisodes && (!result.episodes || result.episodes.length === 0)) {
              const full = await this.getSeriesDetails(result.id, result.media_type || 'tv');
              if (full?.episodes) result.episodes = full.episodes;
            }
            this.cache.set(cacheKey, result);
            if (typeof localStorage !== 'undefined') {
              try {
                localStorage.setItem(`tmdb_v2_media_${cacheKey}`, JSON.stringify(result));
              } catch {}
            }
            return result;
          } else {
            // Explicitly not found on proxy - cache null so original cover is preserved
            this.cache.set(cacheKey, null);
            return null;
          }
        }
      }
    } catch {}

    // 2. Direct fallback (when running without local proxy)
    const cleaned = this.cleanTitleForSearch(rawTitle);
    const queryCandidates = [
      rawTitle,
      rawTitle.toLowerCase().includes('animation') ? null : `${rawTitle} The Animation`,
      cleaned,
      altTitle
    ].filter((q, idx, arr) => q && q.length >= 2 && arr.indexOf(q) === idx) as string[];

    let bestMatch: any = null;
    let highestScore = -1;

    for (const query of queryCandidates) {
      try {
        const tvUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=true`;
        const movieUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=true`;

        const [tvRes, movieRes] = await Promise.all([
          fetch(tvUrl).then((r) => r.json()).catch(() => null),
          fetch(movieUrl).then((r) => r.json()).catch(() => null)
        ]);

        const candidates = [
          ...(tvRes?.results || []).map((r: any) => ({ ...r, media_type: 'tv' })),
          ...(movieRes?.results || []).map((r: any) => ({ ...r, media_type: 'movie' }))
        ];

        for (const r of candidates) {
          if (!r.poster_path && !r.backdrop_path) continue;

          const isAdult = !!r.adult;
          const isAnimation = Array.isArray(r.genre_ids) && r.genre_ids.includes(16);

          // STRICT FILTER: Must be Animation OR adult Asian release.
          // Never match live-action Hollywood/foreign releases (e.g. My Mother the Car, My Fault).
          if (!isAnimation && (!isAdult || !['ja', 'th', 'zh', 'ko'].includes(r.original_language))) {
            continue;
          }

          const candTitle = r.name || r.title || '';
          const sim = Math.max(
            matchSimilarity(rawTitle, candTitle, isAdult),
            altTitle ? matchSimilarity(altTitle, candTitle, isAdult) : 0,
            r.original_name ? matchSimilarity(rawTitle, r.original_name, isAdult) : 0
          );

          if (sim <= 0) continue;

          let score = sim * 100;
          if (isAdult) score += 40;
          if (isAnimation) score += 30;
          if (['ja', 'th', 'zh', 'ko'].includes(r.original_language)) score += 20;
          if (r.media_type === 'tv') score += 10;

          if (score > highestScore) {
            highestScore = score;
            bestMatch = r;
          }
        }

        if (highestScore >= 160) break;
      } catch {}
    }

    if (bestMatch && highestScore >= 120) {
      const id = bestMatch.id;
      const mediaType: 'tv' | 'movie' = bestMatch.media_type || 'tv';
      const full = await this.getSeriesDetails(id, mediaType);
      if (full) {
        this.cache.set(cacheKey, full);
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(`tmdb_v2_media_${cacheKey}`, JSON.stringify(full));
          } catch {}
        }
        return full;
      }
    }

    // No valid anime match found. Gracefully preserve original cover.
    this.cache.set(cacheKey, null);
    return null;
  }
}

export const TMDB = new TmdbService();
