import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Play, Star, Eye, Sparkles } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { API } from '../services/api';
import { TMDB } from '../services/tmdb';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchResultRow: React.FC<{ item: HentaiItem; onClose: () => void }> = ({ item, onClose }) => {
  const id = item.post_ID || item.id || '';
  const title = item.post_title || (item as any).title || 'Untitled';
  const rawThumb = item.post_thumbnail || item.thumbnail || '';
  const initialThumb = rawThumb ? rawThumb.replace(/ /g, '%20') : '';

  const [thumb, setThumb] = useState<string | null>(() => {
    const pre = TMDB.getPreSeeded(title);
    if (pre?.poster) return pre.poster;
    return initialThumb || null;
  });
  const [hasError, setHasError] = useState(false);
  const [isTmdb, setIsTmdb] = useState(false);
  const [checkedTmdb, setCheckedTmdb] = useState(false);

  useEffect(() => {
    const pre = TMDB.getPreSeeded(title);
    if (pre?.poster) {
      setThumb(pre.poster);
      setIsTmdb(true);
      return;
    }

    if (!thumb && !checkedTmdb) {
      setCheckedTmdb(true);
      TMDB.lookup(title).then((res) => {
        if (res?.poster) {
          setThumb(res.poster);
          setIsTmdb(true);
        }
      });
    }
  }, [title, thumb, checkedTmdb]);

  const handleImageError = () => {
    if (!checkedTmdb) {
      setCheckedTmdb(true);
      TMDB.lookup(title).then((res) => {
        if (res?.poster && res.poster !== thumb) {
          setThumb(res.poster);
          setIsTmdb(true);
        } else {
          setHasError(true);
        }
      });
    } else {
      setHasError(true);
    }
  };

  const rating = item.post_rate;
  const views = item.post_views;
  const epCount = item.post_episodes_count || (Array.isArray(item.post_episodes) ? item.post_episodes.length : null);

  return (
    <a
      href={`#/series/${id}`}
      onClick={onClose}
      className="flex items-center gap-3.5 p-2.5 rounded-xl bg-carbon-850/80 hover:bg-carbon-800 border border-white/[0.06] hover:border-white/20 transition-all duration-200 group shadow-sm hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative w-12 h-16 sm:w-14 sm:h-20 flex-none rounded-lg overflow-hidden bg-carbon-900 border border-white/5">
        {!hasError && thumb ? (
          <img
            src={thumb}
            alt={title}
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-carbon-900 text-gray-500">
            <span className="text-[10px] font-bold text-cinema-red">18+</span>
            <span className="text-[9px] text-gray-400 line-clamp-2 mt-0.5">{title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-7 h-7 rounded-full bg-cinema-red flex items-center justify-center text-white shadow-md">
            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cinema-red transition-colors">
            {title}
          </h4>
          {isTmdb && (
            <span className="flex-none px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              TMDB
            </span>
          )}
        </div>
        {item.post_title_alternative && (
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            {item.post_title_alternative}
          </p>
        )}
        <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-gray-400">
          {epCount && (
            <span className="font-semibold text-gray-300">
              {epCount} {Number(epCount) === 1 ? 'Episode' : 'Episodes'}
            </span>
          )}
          {rating && (
            <span className="flex items-center gap-0.5 text-amber-300 font-semibold">
              <Star className="w-3 h-3 fill-amber-300" />
              {rating}
            </span>
          )}
          {views && (
            <span className="flex items-center gap-1 text-gray-400">
              <Eye className="w-3 h-3" />
              {Number(views).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </a>
  );
};

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HentaiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await API.search(val.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      {/* Click outside backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Modal Card */}
      <div className="w-full max-w-2xl bg-carbon-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center gap-3 bg-carbon-950/60">
          <Search className="w-5 h-5 text-gray-400 flex-none ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search all anime series, genres, or keywords..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none"
          />
          {loading ? (
            <Loader2 className="w-5 h-5 text-cinema-red animate-spin flex-none" />
          ) : query ? (
            <button
              onClick={() => handleQueryChange('')}
              className="p-1 text-gray-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-gray-400 bg-white/5 border border-white/10 rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-3.5 space-y-2 flex-1">
          {query.trim() && !loading && results.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <p className="text-sm font-semibold text-gray-300">No titles found matching "{query}"</p>
              <p className="text-xs text-gray-500 mt-1">Try another keyword or browse the genre directory.</p>
            </div>
          )}

          {!query.trim() && (
            <div className="p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Popular Searches</p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {['Harem', 'Uncensored', 'Yuri', 'Maid', 'Succubus', 'Romance', 'Fantasy', 'Teacher'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleQueryChange(tag)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-carbon-850 hover:bg-carbon-800 text-gray-300 hover:text-white border border-white/10 transition cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.map((item) => (
            <SearchResultRow key={item.post_ID || item.id || item.post_title} item={item} onClose={onClose} />
          ))}
        </div>
      </div>
    </div>
  );
};
