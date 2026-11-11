import React, { useEffect, useState } from 'react';
import { GenreTag, HentaiItem } from '../types/api';
import { API } from '../services/api';
import { AnimeCard } from '../components/AnimeCard';

interface GenresPageProps {
  initialGenreId?: number | string;
}

export const GenresPage: React.FC<GenresPageProps> = ({ initialGenreId }) => {
  const [genres, setGenres] = useState<GenreTag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'count' | 'name'>('count');
  const [selectedGenreId, setSelectedGenreId] = useState<number | string | null>(initialGenreId || null);
  const [genreDetail, setGenreDetail] = useState<{ term: GenreTag | null; items: HentaiItem[] } | null>(null);
  const [page, setPage] = useState(1);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Load all genres list
  useEffect(() => {
    let isMounted = true;
    API.getGenres().then((data) => {
      if (isMounted) {
        setGenres(data);
        setLoadingGenres(false);
      }
    }).catch(() => {
      if (isMounted) setLoadingGenres(false);
    });

    return () => { isMounted = false; };
  }, []);

  // Update selected genre if initial prop changes
  useEffect(() => {
    if (initialGenreId) {
      setSelectedGenreId(initialGenreId);
    }
  }, [initialGenreId]);

  // Load genre detail when a genre is selected
  useEffect(() => {
    if (!selectedGenreId) {
      setGenreDetail(null);
      return;
    }

    let isMounted = true;
    setLoadingItems(true);
    setPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    API.getGenreTitles(selectedGenreId, 1).then((res) => {
      if (isMounted) {
        setGenreDetail({
          term: res.term || genres.find(g => String(g.term_id) === String(selectedGenreId)) || null,
          items: res.hentais
        });
        setHasMore(res.hentais.length >= 15);
        setLoadingItems(false);
      }
    }).catch(() => {
      if (isMounted) {
        setGenreDetail(null);
        setLoadingItems(false);
      }
    });

    return () => { isMounted = false; };
  }, [selectedGenreId]);

  const loadMore = async () => {
    if (!selectedGenreId || loadingItems) return;
    const nextPage = page + 1;
    setLoadingItems(true);
    try {
      const res = await API.getGenreTitles(selectedGenreId, nextPage);
      if (res.hentais.length > 0) {
        setGenreDetail(prev => prev ? {
          ...prev,
          items: [...prev.items, ...res.hentais]
        } : null);
        setPage(nextPage);
        setHasMore(res.hentais.length >= 15);
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoadingItems(false);
    }
  };

  // Filter and sort directory list
  let filtered = genres.filter(g => {
    if (!searchQuery.trim()) return true;
    return (g.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
           (g.slug || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  if (sortMode === 'count') {
    filtered.sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0));
  } else {
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  // ==================== VIEW 1: GENRE DETAIL COLLECTION ====================
  if (selectedGenreId && genreDetail) {
    const termName = genreDetail.term?.name || 'Category';
    const termCount = genreDetail.term?.count || genreDetail.items.length;

    return (
      <div className="pt-20 pb-16 max-w-[1720px] mx-auto px-3 sm:px-6 space-y-6 animate-fadeIn">
        {/* Breadcrumb Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedGenreId(null);
              window.location.hash = '#/genres';
            }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition font-semibold"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span>Back to All Categories</span>
          </button>
        </div>

        {/* Hero Header Banner */}
        <div className="relative rounded-2xl overflow-hidden p-6 sm:p-10 border border-white/10 bg-gradient-to-br from-carbon-850 via-carbon-900 to-black shadow-2xl">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#E50914] text-white shadow-md">
                GENRE COLLECTION
              </span>
              <span className="text-xs text-gray-400 font-medium">{termCount} Anime Series</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl uppercase text-white tracking-wide font-extrabold flex items-center gap-3">
              <span className="w-2 h-8 sm:h-10 rounded-full bg-[#E50914] inline-block" />
              {termName}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Explore the complete catalog of {termName} anime series streaming in 1080p Full HD with adaptive HLS cinema player.
            </p>
          </div>

          {/* Quick Switcher Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-4 border-t border-white/10 mt-4">
            <span className="text-[11px] font-bold text-gray-400 uppercase mr-1">Other Genres:</span>
            {genres.slice(0, 10).map((g) => (
              <button
                key={g.term_id}
                onClick={() => {
                  setSelectedGenreId(g.term_id);
                  window.location.hash = `#/genres?id=${g.term_id}`;
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  String(g.term_id) === String(selectedGenreId)
                    ? 'bg-[#E50914] text-white'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Collection Items Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400 px-1 border-b border-white/5 pb-2">
            <span>Showing <strong className="text-white">{genreDetail.items.length}</strong> Titles</span>
          </div>

          {genreDetail.items.length === 0 && !loadingItems ? (
            <div className="py-20 text-center text-gray-400 bg-carbon-900 rounded-2xl border border-white/10">
              <p className="text-sm font-semibold">No anime titles found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {genreDetail.items.map((item) => (
                <AnimeCard key={item.post_ID || item.id} item={item} />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingItems}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition disabled:opacity-50"
              >
                {loadingItems ? <span>Loading next page...</span> : <span>Load More Titles</span>}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== VIEW 2: FLOWFLIX CATEGORY DIRECTORY ====================
  return (
    <div className="pt-20 pb-16 max-w-[1720px] mx-auto px-3 sm:px-6 space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Hero Header Banner (FlowFlix Spec) */}
      <div className="relative rounded-2xl overflow-hidden p-6 sm:p-10 border border-white/10 bg-gradient-to-br from-carbon-850 via-carbon-900 to-black shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#E50914] text-white shadow-md">
                CATEGORY DIRECTORY
              </span>
              <span className="text-xs text-gray-400 font-medium">{genres.length} Curated Genres</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl uppercase text-white tracking-wide font-extrabold flex items-center gap-3">
              <span className="w-2 h-8 sm:h-10 rounded-full bg-[#E50914] inline-block" />
              GENRES &amp; THEMES
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Explore releases by theme, archetype, and style. Select any category below to stream hundreds of matched series in 1080p Full HD.
            </p>
          </div>

          {/* Controls: Live Filter + Sort Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-shrink-0">
            {/* Live Search Filter */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter genres (e.g. Yuri, 3D)..."
                className="w-full bg-carbon-800 border border-white/15 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#E50914] transition shadow-inner"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1 bg-carbon-800 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setSortMode('count')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  sortMode === 'count' ? 'bg-[#E50914] text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                🔥 Most Titles
              </button>
              <button
                onClick={() => setSortMode('name')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  sortMode === 'name' ? 'bg-[#E50914] text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                🔤 A–Z
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Genres Count Status Bar */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-1 border-b border-white/5 pb-2">
        <span>Showing <strong className="text-white">{filtered.length}</strong> of {genres.length} Genres</span>
        <span className="hidden sm:inline">Click any genre card to open full collection</span>
      </div>

      {/* Genres Cards Grid (FlowFlix 16/11 Aspect Ratio Cards) */}
      {loadingGenres ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 animate-pulse">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="aspect-[16/11] bg-carbon-800 rounded-xl shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-carbon-900 rounded-2xl border border-white/10 max-w-lg mx-auto p-8 space-y-3">
          <h3 className="font-bold text-base text-white">No genres matched "{searchQuery}"</h3>
          <p className="text-xs text-gray-400">Try searching for a different keyword or reset your filter.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#E50914] text-white mt-2"
          >
            Clear Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filtered.map((g) => {
            const count = Number(g.count) || 0;
            const thumbUrl = g.thumbnail ? g.thumbnail.replace(/ /g, '%20') : '';
            return (
              <div
                key={g.term_id}
                onClick={() => {
                  setSelectedGenreId(g.term_id);
                  window.location.hash = `#/genres?id=${g.term_id}`;
                }}
                className="group relative aspect-[16/11] rounded-xl overflow-hidden bg-carbon-850 border border-white/10 hover:border-[#E50914]/60 cursor-pointer shadow-lg transition-all duration-300 hover:-translate-y-1 select-none flex flex-col justify-end p-3 sm:p-4"
              >
                {/* Fallback Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-carbon-800 via-carbon-900 to-black" />

                {/* Background Thumbnail Image with Zoom on Hover */}
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={g.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 filter brightness-[0.70] group-hover:brightness-[0.9]"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}

                {/* Dark Vignette & Hover Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-[#E50914]/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Top Count Badge */}
                <div className="absolute top-2.5 right-2.5 z-10">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/80 backdrop-blur-md text-gray-200 border border-white/15 group-hover:bg-[#E50914] group-hover:text-white group-hover:border-transparent transition-all">
                    {count} Titles
                  </span>
                </div>

                {/* Card Title Content */}
                <div className="relative z-10 space-y-0.5">
                  <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-[#E50914] transition-colors leading-snug line-clamp-2">
                    {g.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 group-hover:text-gray-300 transition-colors">
                    Stream Collection ›
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
