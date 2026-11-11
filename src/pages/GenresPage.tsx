import React, { useEffect, useState } from 'react';
import { GenreTag, HentaiItem } from '../types/api';
import { API } from '../services/api';
import { AnimeCard } from '../components/AnimeCard';
import { Compass, Search, Loader2, ArrowRight } from 'lucide-react';

interface GenresPageProps {
  initialGenreId?: number | string;
}

export const GenresPage: React.FC<GenresPageProps> = ({ initialGenreId }) => {
  const [genres, setGenres] = useState<GenreTag[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<GenreTag | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [items, setItems] = useState<HentaiItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    let isMounted = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    API.getGenres().then((data) => {
      if (isMounted) {
        setGenres(data);
        setLoadingGenres(false);
        if (data.length > 0) {
          const match = initialGenreId
            ? data.find((g) => String(g.term_id) === String(initialGenreId))
            : data[0];
          setSelectedGenre(match || data[0]);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [initialGenreId]);

  // Load items when selectedGenre changes
  useEffect(() => {
    if (!selectedGenre) return;
    let isMounted = true;
    setLoadingItems(true);
    setPage(1);

    API.getGenreTitles(selectedGenre.term_id, 1).then((res) => {
      if (isMounted) {
        setItems(res.hentais);
        setHasMore(res.hentais.length >= 10);
        setLoadingItems(false);
      }
    }).catch(() => {
      if (isMounted) {
        setItems([]);
        setLoadingItems(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedGenre]);

  const loadMore = async () => {
    if (!selectedGenre || loadingItems) return;
    const nextPage = page + 1;
    setLoadingItems(true);
    try {
      const res = await API.getGenreTitles(selectedGenre.term_id, nextPage);
      if (res.hentais.length > 0) {
        setItems((prev) => [...prev, ...res.hentais]);
        setPage(nextPage);
        setHasMore(res.hentais.length >= 10);
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoadingItems(false);
    }
  };

  const filteredGenres = genres.filter((g) =>
    g.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="pt-20 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-cinema-red" />
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Explore Genres & Categories
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-400">
          Browse specialized themes, fetishes, and tags across the entire Voidflix library.
        </p>
      </div>

      {/* Genre Filter & Cloud */}
      <div className="bg-carbon-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter genre tags..."
              className="w-full bg-carbon-800 text-xs text-white pl-9 pr-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-white/20"
            />
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {filteredGenres.length} Categories
          </span>
        </div>

        {/* Tags Cloud */}
        {loadingGenres ? (
          <div className="flex flex-wrap gap-2 animate-pulse">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-7 w-20 bg-carbon-800 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredGenres.map((genre) => {
              const active = selectedGenre?.term_id === genre.term_id;
              return (
                <button
                  key={genre.term_id}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    active
                      ? 'bg-cinema-red text-white shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                  }`}
                >
                  {genre.name}
                  {genre.count ? (
                    <span className="ml-1.5 text-[10px] text-gray-400 font-normal">
                      ({genre.count})
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Current Selected Category Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{selectedGenre?.name || 'Genre'} Series</span>
            <span className="text-xs font-semibold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
              {items.length} Titles
            </span>
          </h2>
        </div>

        {items.length === 0 && !loadingItems ? (
          <div className="py-12 text-center text-gray-400 bg-carbon-900 rounded-2xl border border-white/10">
            <p className="text-sm font-semibold">No titles found for this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {items.map((item) => (
              <AnimeCard key={item.post_ID || item.id} item={item} />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && items.length > 0 && (
          <div className="pt-6 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingItems}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition disabled:opacity-50"
            >
              {loadingItems ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cinema-red" />
                  <span>Loading next page...</span>
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
