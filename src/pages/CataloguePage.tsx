import React, { useEffect, useState } from 'react';
import { HentaiItem } from '../types/api';
import { API } from '../services/api';
import { AnimeCard } from '../components/AnimeCard';
import { Film, Filter, Loader2, ArrowRight } from 'lucide-react';

interface CataloguePageProps {
  initialSort?: 'trending' | 'latest' | 'views';
}

export const CataloguePage: React.FC<CataloguePageProps> = ({ initialSort = 'trending' }) => {
  const [items, setItems] = useState<HentaiItem[]>([]);
  const [activeLetter, setActiveLetter] = useState('ALL');
  const [sort, setSort] = useState<'trending' | 'latest' | 'views'>(initialSort);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const letters = ['ALL', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  const fetchItems = async (targetLetter: string, pageNum: number, append = false) => {
    setLoading(true);
    try {
      let data: HentaiItem[] = [];
      if (targetLetter === 'ALL') {
        const query = sort === 'latest' ? 'latest' : sort === 'trending' ? 'trending' : 'anime';
        data = await API.search(query, pageNum);
      } else {
        data = await API.search(targetLetter, pageNum);
      }

      if (append) {
        setItems((prev) => [...prev, ...data]);
      } else {
        setItems(data);
      }
      setHasMore(data.length >= 15);
    } catch {
      if (!append) setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPage(1);
    fetchItems(activeLetter, 1, false);
  }, [activeLetter, sort]);

  const handleSelectLetter = (l: string) => {
    setActiveLetter(l);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchItems(activeLetter, nextPage, true);
  };

  return (
    <div className="pt-20 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-cinema-red" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Anime Catalogue & Directory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Browse through hundreds of titles sorted alphabetically or by popularity.
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5 bg-carbon-900 border border-white/10 p-1 rounded-xl self-start sm:self-auto">
          {[
            { id: 'trending', label: 'Trending' },
            { id: 'latest', label: 'Latest Releases' },
            { id: 'views', label: 'Most Viewed' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                sort === s.id
                  ? 'bg-cinema-red text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* A-Z Alphabetical Filter Bar */}
      <div className="bg-carbon-900 border border-white/10 rounded-2xl p-3 sm:p-4">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {letters.map((char) => {
            const active = activeLetter === char;
            return (
              <button
                key={char}
                onClick={() => handleSelectLetter(char)}
                className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center flex-none ${
                  active
                    ? 'bg-cinema-red text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {char}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Results */}
      <div className="space-y-6">
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-carbon-850 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-gray-400 bg-carbon-900 rounded-2xl border border-white/10">
            <p className="text-sm font-semibold">No anime titles found matching letter "{activeLetter}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {items.map((item) => (
              <AnimeCard key={item.post_ID || item.id} item={item} />
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && items.length > 0 && (
          <div className="pt-6 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cinema-red" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Load More Titles</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
