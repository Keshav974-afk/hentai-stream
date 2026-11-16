import React, { useEffect, useState } from 'react';
import { Play, Plus, Check, Info, Star, Eye, Sparkles } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { useWatchlist } from '../hooks/useLocalStorage';
import { TMDB } from '../services/tmdb';

interface HeroBannerProps {
  items: HentaiItem[];
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [backdropMap, setBackdropMap] = useState<Record<string, string>>({});
  const { isSaved, toggleWatchlist } = useWatchlist();

  // Filter out items that have no title
  const validItems = items.filter((it) => it && (it.post_title || (it as any).title));
  const slides = validItems.slice(0, 6);

  // Auto-advance slides every 8 seconds when not hovered
  useEffect(() => {
    if (slides.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [slides.length, isHovered]);

  // Pre-load TMDB backdrops for slides
  useEffect(() => {
    slides.forEach((item) => {
      const id = String(item.post_ID || item.id || '');
      const title = item.post_title || (item as any).title || '';
      if (!backdropMap[id] && title) {
        // Check pre-seeded first
        const pre = TMDB.getPreSeeded(title);
        if (pre?.backdrop) {
          setBackdropMap((prev) => ({ ...prev, [id]: pre.backdrop! }));
          return;
        }
        if (pre?.poster) {
          setBackdropMap((prev) => ({ ...prev, [id]: pre.poster! }));
          return;
        }

        // Asynchronously check TMDB
        TMDB.lookup(title).then((res) => {
          if (res?.backdrop) {
            setBackdropMap((prev) => ({ ...prev, [id]: res.backdrop! }));
          } else if (res?.poster) {
            setBackdropMap((prev) => ({ ...prev, [id]: res.poster! }));
          }
        });
      }
    });
  }, [slides, backdropMap]);

  if (slides.length === 0) return null;

  const current = slides[currentIndex];
  const id = String(current.post_ID || current.id || '');
  const title = current.post_title || 'Featured Series';
  const altTitle = current.post_title_alternative;
  const rawThumbnail = current.post_thumbnail || current.thumbnail || '';
  const thumbnail = rawThumbnail ? rawThumbnail.replace(/ /g, '%20') : '';
  const synopsis = current.post_content?.replace(/<[^>]*>/g, '') || '';
  const rating = current.post_rate;
  const views = current.post_views;
  const bookmarked = isSaved(id);

  // Use TMDB backdrop if available, fallback to thumbnail
  const activeBackdrop = backdropMap[id] || thumbnail;

  const handleToggleBookmark = () => {
    toggleWatchlist({
      seriesId: id,
      title,
      thumbnail: activeBackdrop || thumbnail,
      rating,
      views
    });
  };

  return (
    <div
      className="relative w-full min-h-[480px] sm:min-h-[540px] lg:min-h-[620px] flex items-end overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Backdrop Image with Smooth Fade */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {activeBackdrop ? (
          <img
            key={activeBackdrop}
            src={activeBackdrop}
            alt={title}
            className="w-full h-full object-cover object-center filter brightness-[0.4] transition-all duration-1000 ease-out transform scale-100 hover:scale-102 animate-fade-in"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-carbon-900 via-carbon-950 to-black" />
        )}

        {/* Cinematic Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/65 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-carbon-950 via-carbon-950/80 to-transparent max-w-4xl" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-carbon-950/50" />
      </div>

      {/* Hero Content Information */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-32 w-full">
        <div className="max-w-2xl space-y-4">
          {/* Badges Cluster */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#E50914] text-white uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Spotlight
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-black/60 text-white/90 border border-white/10 backdrop-blur-md">
              18+ Explicit
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 text-gray-200 border border-white/10 backdrop-blur-md">
              Ultra HD 1080p
            </span>
            {backdropMap[id] && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>TMDB Enhanced</span>
              </span>
            )}
            {rating && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                <Star className="w-3 h-3 fill-amber-300" />
                {rating}
              </span>
            )}
            {views && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-gray-300 bg-black/40 border border-white/10 backdrop-blur-md">
                <Eye className="w-3 h-3 text-gray-400" />
                {Number(views).toLocaleString()} Views
              </span>
            )}
          </div>

          {/* Titles */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2">
              {title}
            </h1>
            {altTitle && (
              <p className="text-xs sm:text-sm text-zinc-400 font-medium line-clamp-1 italic">
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

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href={`#/series/${id}`}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm tracking-wide transition active:scale-95"
            >
              <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
              <span>Watch Now</span>
            </a>

            <button
              onClick={handleToggleBookmark}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all duration-200 active:scale-95 cursor-pointer ${
                bookmarked
                  ? 'bg-zinc-800 border-zinc-600 text-white'
                  : 'bg-zinc-900/90 border-white/10 text-zinc-200 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {bookmarked ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>In My List</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add to List</span>
                </>
              )}
            </button>

            <a
              href={`#/series/${id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm font-semibold transition"
            >
              <Info className="w-4 h-4" />
              <span>Details</span>
            </a>
          </div>
        </div>

        {/* Carousel Slide Indicators */}
        {slides.length > 1 && (
          <div className="flex items-center gap-2 mt-6">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? 'w-7 bg-white'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
