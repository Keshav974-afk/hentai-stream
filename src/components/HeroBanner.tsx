import React, { useEffect, useState } from 'react';
import { Play, Plus, Check, Info, Award, Star } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { useWatchlist } from '../hooks/useLocalStorage';
import { TMDB, TmdbMediaInfo } from '../services/tmdb';

interface HeroBannerProps {
  items: HentaiItem[];
  onMoreInfo?: (item: HentaiItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ items, onMoreInfo }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [mediaMap, setMediaMap] = useState<Record<string, TmdbMediaInfo | null>>({});
  const { isSaved, toggleWatchlist } = useWatchlist();

  const validItems = items.filter((it) => it && (it.post_title || (it as any).title));
  const slides = validItems.slice(0, 6);

  // Auto-advance slides every 8s
  useEffect(() => {
    if (slides.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [slides.length, isHovered]);

  // Pre-load TMDB data
  useEffect(() => {
    slides.forEach((item) => {
      const id = String(item.post_ID || item.id || '');
      const title = item.post_title || (item as any).title || '';
      if (!mediaMap[id] && title) {
        TMDB.lookup(title, true).then((res) => {
          if (res) {
            setMediaMap((prev) => ({ ...prev, [id]: res }));
          }
        });
      }
    });
  }, [slides, mediaMap]);

  if (slides.length === 0) return null;

  const current = slides[currentIndex];
  const id = String(current.post_ID || current.id || '');
  const title = current.post_title || 'Featured Anime';
  const altTitle = current.post_title_alternative;
  const rawThumbnail = current.post_thumbnail || current.thumbnail || '';
  const thumbnail = rawThumbnail ? rawThumbnail.replace(/ /g, '%20') : '';
  const tmdb = mediaMap[id];
  const activeBackdrop = tmdb?.backdrop || thumbnail;
  const activePoster = tmdb?.poster || thumbnail;
  const synopsis = tmdb?.overview || current.post_content?.replace(/<[^>]*>/g, '').trim() || '';
  const rating = tmdb?.vote_average ? String(tmdb.vote_average.toFixed(1)) : current.post_rate;
  const bookmarked = isSaved(id);

  const handleToggle = () => {
    toggleWatchlist({
      seriesId: id,
      title,
      thumbnail: activePoster || thumbnail,
      rating,
      views: current.post_views
    });
  };

  const handlePlay = () => {
    window.location.hash = `#/series/${id}`;
  };

  const handleOpenInfo = () => {
    if (onMoreInfo) {
      onMoreInfo(current);
    } else {
      window.location.hash = `#/series/${id}`;
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="select-none"
    >
      {/* =========================================================================
          MOBILE HERO (md:hidden) — FlowFlix Mobile 2:3 Cinematic Aspect Card
          ========================================================================= */}
      <section className="px-3 sm:px-4 pt-20 pb-2 md:hidden">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[340px] overflow-hidden rounded-2xl sm:rounded-3xl bg-neutral-900 border border-white/10 shadow-2xl">
          <img
            src={activePoster || activeBackdrop}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          />

          {/* Vignette Gradients */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />

          {/* Bottom Overlaid Content */}
          <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-center text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide line-clamp-2">
              {title}
            </h1>

            {/* Genre & Metadata bullet line */}
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white/90">
              <span>Hentai</span>
              <span className="text-[#E50914]">•</span>
              <span>Anime Series</span>
              <span className="text-[#E50914]">•</span>
              <span className="rounded-sm border border-white/40 bg-black/40 px-1 py-0.2 text-[10px] font-bold">
                18+
              </span>
            </div>

            {/* Action Buttons: Play + My List + More Info */}
            <div className="flex w-full items-center gap-2 pt-1">
              <button
                onClick={handlePlay}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-bold text-black shadow-lg hover:bg-white/90 active:scale-95 transition cursor-pointer"
              >
                <Play className="size-4 fill-current ml-0.5" />
                <span>Play</span>
              </button>

              <button
                onClick={handleToggle}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md py-2.5 text-sm font-semibold text-white active:scale-95 transition border border-white/10 cursor-pointer"
              >
                {bookmarked ? (
                  <>
                    <Check className="size-4 text-emerald-400" />
                    <span>In List</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    <span>My List</span>
                  </>
                )}
              </button>

              <button
                onClick={handleOpenInfo}
                className="size-10 grid place-items-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white active:scale-95 transition border border-white/10 cursor-pointer flex-shrink-0"
                aria-label="More Info"
                title="More Info"
              >
                <Info className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Slide Indicators */}
        {slides.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className="p-1 cursor-pointer"
              >
                <span
                  className={`block h-1 rounded-full transition-all duration-300 ${
                    idx === currentIndex ? 'w-6 bg-[#E50914]' : 'w-2.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* =========================================================================
          DESKTOP HERO (hidden md:block) — FlowFlix Rounded Billboard Container
          ========================================================================= */}
      <section className="hidden md:block relative px-4 sm:px-8 md:px-12 lg:px-16 pt-24 md:pt-28 pb-4 sm:pb-6">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/9] lg:h-[80vh] w-full max-w-[1800px] mx-auto overflow-hidden rounded-2xl sm:rounded-3xl bg-neutral-900 shadow-2xl">
          {/* Base Backdrop Image */}
          <img
            key={activeBackdrop}
            src={activeBackdrop}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover filter brightness-[0.45] transition-all duration-700 ease-out"
          />

          {/* FlowFlix Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent max-w-4xl" />

          {/* Desktop Left Info Block */}
          <div className="absolute inset-y-0 left-0 p-8 sm:p-12 lg:p-16 flex flex-col justify-end max-w-2xl space-y-4 z-10">
            {/* Top Badge & Bullet Line */}
            <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
              <span className="rounded-sm bg-[#E50914] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Spotlight
              </span>
              <span>Anime Series</span>
              <span className="text-[#E50914]">•</span>
              <span className="rounded-sm border border-white/30 bg-black/40 px-1.5 py-0.2 text-[10px] font-bold">
                18+ EXPLICIT
              </span>
              <span className="rounded-sm border border-white/30 bg-black/40 px-1.5 py-0.2 text-[10px] font-bold">
                HD 1080P
              </span>
            </div>

            {/* Titles */}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight line-clamp-2">
                {title}
              </h1>
              {altTitle && (
                <p className="text-xs sm:text-sm text-zinc-400 font-medium italic line-clamp-1">
                  {altTitle}
                </p>
              )}
            </div>

            {/* Synopsis */}
            {synopsis && (
              <p className="text-xs sm:text-sm text-zinc-300 line-clamp-3 leading-relaxed max-w-xl">
                {synopsis}
              </p>
            )}

            {/* Action Buttons Row */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handlePlay}
                className="flex items-center gap-2 rounded-full bg-white hover:bg-white/90 text-black font-bold px-7 py-2.5 text-sm shadow-lg active:scale-95 transition cursor-pointer"
              >
                <Play className="size-4 fill-current ml-0.5" />
                <span>Play</span>
              </button>

              <button
                onClick={handleToggle}
                className="flex items-center gap-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-2.5 text-sm font-semibold text-white border border-white/10 active:scale-95 transition cursor-pointer"
              >
                {bookmarked ? (
                  <>
                    <Check className="size-4 text-emerald-400" />
                    <span>In My List</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    <span>My List</span>
                  </>
                )}
              </button>

              <button
                onClick={handleOpenInfo}
                className="size-10 grid place-items-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/10 active:scale-95 transition cursor-pointer"
                aria-label="More Info"
                title="More Info"
              >
                <Info className="size-4" />
              </button>
            </div>
          </div>

          {/* Desktop Bottom-Right Accolade Badge (FlowFlix signature) */}
          <div className="absolute bottom-8 right-8 hidden sm:flex items-center gap-3 z-10">
            {rating && (
              <div className="glass-chip rounded-full px-3.5 py-1.5 text-xs text-white/90 flex items-center gap-1.5">
                <Award className="size-3.5 text-amber-400" />
                <span className="font-bold">Top Rated ({rating})</span>
              </div>
            )}
          </div>

          {/* Desktop Slide Indicators */}
          {slides.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className="p-1 cursor-pointer"
                >
                  <span
                    className={`block h-1 rounded-full transition-all duration-300 ${
                      idx === currentIndex ? 'w-8 bg-[#E50914]' : 'w-2.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
