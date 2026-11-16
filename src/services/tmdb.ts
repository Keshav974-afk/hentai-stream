// TMDB Poster & Backdrop Enrichment Service
// Integrates The Movie Database (TMDB) API to fetch high-resolution posters & backdrops

export interface TmdbMediaInfo {
  id: number;
  name: string;
  poster: string | null;
  backdrop: string | null;
}

const TMDB_API_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Pre-seeded verified TMDB matches for known popular & broken titles
const PRE_SEEDED_TMDB: Record<string, { id: number; poster: string; backdrop?: string }> = {
  // Mouse Cursor
  'mouse cursor': {
    id: 334779,
    poster: 'https://image.tmdb.org/t/p/w500/y3gE67auOFwfS4zLTFKu4VZvb1a.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/2YCsvsdWbbT9HT2EK4024JRSF5f.jpg'
  },
  'mouse cursor de genjitsu': {
    id: 334779,
    poster: 'https://image.tmdb.org/t/p/w500/y3gE67auOFwfS4zLTFKu4VZvb1a.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/2YCsvsdWbbT9HT2EK4024JRSF5f.jpg'
  },
  // Hitozukiai ga Nigate
  'hitozukiai ga nigate': {
    id: 334504,
    poster: 'https://image.tmdb.org/t/p/w500/dYJOSnFf9O9hDcTbSyZPQb5Xnb8.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/m99P4w0X0xNqIomcK7g5lK2U0b7.jpg'
  },
  // Oushun Jogakuen
  'oushun jogakuen': {
    id: 337197,
    poster: 'https://image.tmdb.org/t/p/w500/qxromWcA2F2D5Hy1QG68M5tWzQd.jpg'
  },
  // NTR Kishi
  'ntr kishi': {
    id: 326395,
    poster: 'https://image.tmdb.org/t/p/w500/gBTscSOdFqQzpJGvazskNByaHV1.jpg'
  },
  // Kanojo no Tomodachi
  'kanojo no tomodachi': {
    id: 336654,
    poster: 'https://image.tmdb.org/t/p/w500/3DN0UnAUrLaY382mFdbv1wrVQNC.jpg'
  },
  // Netorareta Bakunyuu Tsuma-tachi
  'netorareta bakunyuu': {
    id: 292291,
    poster: 'https://image.tmdb.org/t/p/w500/dZGvL06uj5KRpBGHLTkzdX9HW8Z.jpg'
  },
  // Muramata-san no Aijou
  'muramata san no aijou': {
    id: 337204,
    poster: 'https://image.tmdb.org/t/p/w500/9pKZjOiJ7aaA4gMGkcXPJZELXY2.jpg'
  },
  // Mujikaku na Osananajimi
  'mujikaku na osananajimi': {
    id: 326790,
    poster: 'https://image.tmdb.org/t/p/w500/wrqnMRBnh5L2BTTLYUBrkF1L1vh.jpg'
  },
  // Pure x Holic
  'pure x holic': {
    id: 323836,
    poster: 'https://image.tmdb.org/t/p/w500/A3awMfTZJJag2OOxeP7g0WuAudy.jpg'
  },
  // Sare Tsuma wa Ubawaretai
  'sare tsuma wa ubawaretai': {
    id: 323604,
    poster: 'https://image.tmdb.org/t/p/w500/1qmyS9zOskTN8sr5UnqlU0PsSNE.jpg'
  },
  // Overflow
  'overflow': {
    id: 97890,
    poster: 'https://image.tmdb.org/t/p/w500/uHIOTJXN9nNTc51WyunL43Fvge3.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/otEKvJA72Pue5RDgVrBqdOqgAd.jpg'
  },
  // Imaizumin-chi
  'imaizumin': {
    id: 133276,
    poster: 'https://image.tmdb.org/t/p/w500/hcfYHAAL6hPlzOeM1tTNJkMguij.jpg'
  },
  // Euphoria
  'euphoria': {
    id: 112108,
    poster: 'https://image.tmdb.org/t/p/w500/aJrG7OkoTMPWG5c8opz8a93AZPY.jpg'
  },
  // Rance
  'rance': {
    id: 104523,
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
          name: title,
          poster: val.poster,
          backdrop: val.backdrop || null
        };
      }
    }
    return null;
  }

  public async lookup(title: string): Promise<TmdbMediaInfo | null> {
    if (!title || typeof title !== 'string') return null;

    const key = this.normalizeKey(title);
    if (this.cache.has(key)) {
      return this.cache.get(key) || null;
    }

    // Check pre-seeded matches first (instant zero-latency hit)
    const preSeeded = this.getPreSeeded(title);
    if (preSeeded) {
      this.cache.set(key, preSeeded);
      return preSeeded;
    }

    // Check localStorage cache
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`tmdb_media_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.cache.set(key, parsed);
          return parsed;
        }
      } catch {}
    }

    // Deduplicate concurrent inflight requests
    if (this.inflight.has(key)) {
      return this.inflight.get(key)!;
    }

    const promise = this.executeSearch(title, key);
    this.inflight.set(key, promise);
    try {
      const result = await promise;
      return result;
    } finally {
      this.inflight.delete(key);
    }
  }

  private async executeSearch(rawTitle: string, cacheKey: string): Promise<TmdbMediaInfo | null> {
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
            const poster = match.poster || (match.poster_path ? `${TMDB_IMAGE_BASE}/w500${match.poster_path}` : null);
            const backdrop = match.backdrop || (match.backdrop_path ? `${TMDB_IMAGE_BASE}/original${match.backdrop_path}` : null);

            const result: TmdbMediaInfo = {
              id: match.id || match.tmdb_id,
              name: match.name || match.title || rawTitle,
              poster,
              backdrop
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
      } catch (err) {
        // Network or fetch failed, try next candidate
      }
    }

    // No match found
    this.cache.set(cacheKey, null);
    return null;
  }
}

export const TMDB = new TmdbService();
