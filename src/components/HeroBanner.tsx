import React, { useEffect, useState } from 'react';
import { Play, Plus, Check, Info, Star, Eye } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { useWatchlist } from '../hooks/useLocalStorage';

interface HeroBannerProps {
  items: HentaiItem[];
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { isSaved, toggleWatchlist } = useWatchlist();

  const slides = items.slice(0, 5);

  useEffect(() => {
    if (slides.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [slides.length, isHovered]);

  if (slides.length === 0) return null;

  const current = slides[currentIndex];
  const id = current.post_ID || current.id || '';
  const title = current.post_title || 'Featured Series';
  const altTitle = current.post_title_alternative;
  const thumbnail = current.post_thumbnail || '';
  const synopsis = current.post_content?.replace(/<[^>]*>/g, '') || '';
  const rating = current.post_rate;
  const views = current.post_views;
  const bookmarked = isSaved(id);

  const handleToggleBookmark = () => {
    toggleWatchlist({
      seriesId: id,
      title,
      thumbnail,
      rating,
      views
    });
  };

  return (
    <div
      className="relative w-full min-h-[460px] sm:min-h-[520px] lg:min-h-[600px] flex items-end overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Backdrop Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover object-center filter brightness-[0.45] transition-all duration-700 ease-out transform scale-100 hover:scale-102"
        />
        {/* Cinematic Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-carbon-950 via-carbon-950/70 to-transparent max-w-4xl" />
      </div>

      {/* Hero Content Information */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-32 w-full">
        <div className="max-w-2xl space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cinema-red text-white uppercase tracking-wider">
              Spotlight
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 text-gray-200 border border-white/10 backdrop-blur-md">
              18+ Explicit
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 text-gray-200 border border-white/10 backdrop-blur-md">
              Ultra HD
            </span>
            {rating && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Star className="w-3 h-3 fill-amber-300" />
                {rating}
              </span>
            )}
            {views && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-gray-300 bg-black/40 border border-white/10">
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
              <p className="text-xs sm:text-sm text-gray-400 font-medium line-clamp-1 italic">
                {altTitle}
              </p>
            )}
          </div>

          {/* Synopsis */}
          {synopsis && (
            <p className="text-xs sm:text-sm text-gray-300 line-clamp-3 leading-relaxed max-w-xl">
              {synopsis}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href={`#/series/${id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cinema-red hover:bg-cinema-crimson text-white font-semibold text-sm transition-all duration-200 active:scale-95 shadow-md"
            >
              <Play className="w-4 h-4 fill-white ml-0.5" />
              <span>Watch Now</span>
            </a>

            <button
              onClick={handleToggleBookmark}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 active:scale-95 backdrop-blur-md ${
                bookmarked
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'bg-white/5 border-white/15 text-gray-200 hover:bg-white/10 hover:text-white'
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-sm font-semibold transition"
            >
              <Info className="w-4 h-4" />
              <span>Series Details</span>
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
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-8 bg-cinema-red'
                    : 'w-2 bg-white/30 hover:bg-white/50'
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
