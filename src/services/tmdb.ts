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
  }
};

class TmdbService {
  private cache = new Map<string, TmdbMediaInfo | null>();
  private inflight = new Map<string, Promise<TmdbMediaInfo | null>>();

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
        const stored = localStorage.getItem(`tmdb_details_${cacheKey}`);
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
                localStorage.setItem(`tmdb_details_${cacheKey}`, JSON.stringify(json.data));
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
              localStorage.setItem(`tmdb_details_${cacheKey}`, JSON.stringify(result));
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
  public async lookup(title: string, withEpisodes: boolean = false): Promise<TmdbMediaInfo | null> {
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

    // Check localStorage cache
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`tmdb_media_${key}`);
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

    const promise = this.executeSearch(title, key, withEpisodes);
    this.inflight.set(key, promise);
    try {
      const result = await promise;
      return result;
    } finally {
      this.inflight.delete(key);
    }
  }

  private async executeSearch(rawTitle: string, cacheKey: string, withEpisodes: boolean): Promise<TmdbMediaInfo | null> {
    const cleaned = this.cleanTitleForSearch(rawTitle);
    const words = cleaned.split(' ').filter(Boolean);

    // Multi-tier query strategies: Full title -> Cleaned title -> First 4 words -> First 2 words
    const queryCandidates = [
      rawTitle,
      cleaned,
      words.slice(0, 4).join(' '),
      words.slice(0, 2).join(' ')
    ].filter((q, idx, arr) => q && q.length >= 3 && arr.indexOf(q) === idx);

    for (const query of queryCandidates) {
      try {
        // Try local proxy endpoint first, fallback to direct TMDB
        let data: any = null;
        try {
          const proxyRes = await fetch(`/api/tmdb?title=${encodeURIComponent(query)}`);
          if (proxyRes.ok) {
            const json = await proxyRes.json();
            if (json && json.success && json.data) {
              data = { results: [json.data] };
            }
          }
        } catch {}

        if (!data) {
          const directUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=true`;
          const res = await fetch(directUrl);
          if (res.ok) {
            data = await res.json();
          }
        }

        if (data && Array.isArray(data.results)) {
          const match = data.results.find((r: any) => r.poster_path || r.backdrop_path || r.poster);
          if (match) {
            const id = match.id || match.tmdb_id;
            const mediaType: 'tv' | 'movie' = match.media_type || (match.first_air_date ? 'tv' : 'movie');
            const poster = match.poster || (match.poster_path ? `${TMDB_IMAGE_BASE}/w500${match.poster_path}` : null);
            const backdrop = match.backdrop || (match.backdrop_path ? `${TMDB_IMAGE_BASE}/original${match.backdrop_path}` : null);

            let episodes: TmdbEpisodeInfo[] = match.episodes || [];
            let overview = match.overview || '';

            if (withEpisodes && episodes.length === 0 && id) {
              const full = await this.getSeriesDetails(id, mediaType);
              if (full) {
                if (full.episodes) episodes = full.episodes;
                if (full.overview) overview = full.overview;
              }
            }

            const result: TmdbMediaInfo = {
              id,
              media_type: mediaType,
              name: match.name || match.title || rawTitle,
              overview,
              poster,
              backdrop,
              first_air_date: match.first_air_date || match.release_date,
              vote_average: match.vote_average,
              episodes
            };

            this.cache.set(cacheKey, result);
            if (typeof localStorage !== 'undefined') {
              try {
                localStorage.setItem(`tmdb_media_${cacheKey}`, JSON.stringify(result));
              } catch {}
            }
            return result;
          }
        }
      } catch {
        // Network or fetch failed, try next candidate
      }
    }

    // No match found
    this.cache.set(cacheKey, null);
    return null;
  }
}

export const TMDB = new TmdbService();
