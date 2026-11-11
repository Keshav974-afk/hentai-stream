import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Play, Star, Eye } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { API } from '../services/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Modal Card */}
      <div className="w-full max-w-2xl bg-carbon-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400 flex-none ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search anime series, genres, or keywords..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none"
          />
          {loading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-none" />
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
        <div className="overflow-y-auto p-3 space-y-2 flex-1">
          {query.trim() && !loading && results.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <p className="text-sm font-semibold">No titles found for "{query}"</p>
              <p className="text-xs text-gray-500 mt-1">Try another keyword or browse the genre catalogue.</p>
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
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.map((item) => {
            const id = item.post_ID || item.id || '';
            const title = item.post_title || 'Untitled';
            const thumbnail = item.post_thumbnail || '';
            const rating = item.post_rate;
            const views = item.post_views;
            const epCount = item.post_episodes_count || (Array.isArray(item.post_episodes) ? item.post_episodes.length : null);

            return (
              <a
                key={id}
                href={`#/series/${id}`}
                onClick={onClose}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition group"
              >
                {/* Thumbnail */}
                <div className="relative w-12 h-16 sm:w-14 sm:h-20 flex-none rounded-lg overflow-hidden bg-carbon-800">
                  <img
                    src={thumbnail}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cinema-red transition-colors">
                    {title}
                  </h4>
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
                      <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400" />
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
          })}
        </div>
      </div>
    </div>
  );
};
