import React, { useState, useEffect } from 'react';
import { Play, Bookmark, Star, Eye, Sparkles } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { useWatchlist } from '../hooks/useLocalStorage';
import { TMDB } from '../services/tmdb';

interface AnimeCardProps {
  item: HentaiItem;
  rank?: number;
  className?: string;
  showEpisodeBadge?: boolean;
  isFeatured?: boolean; // When true, hides completely if image is broken/unfound
  onImageError?: () => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  item,
  rank,
  className = '',
  showEpisodeBadge = true,
  isFeatured = false,
  onImageError,
}) => {
  const { isSaved, toggleWatchlist } = useWatchlist();

  const id = item.post_ID || item.id || '';
  const title = item.post_title || (item as any).title || 'Untitled';
  const rawThumbnail = item.post_thumbnail || item.thumbnail || (item as any).cover || '';
  const initialThumb = rawThumbnail ? rawThumbnail.replace(/ /g, '%20') : '';

  const [activeImage, setActiveImage] = useState<string | null>(() => {
    // Check if TMDB pre-seeded exists first
    const pre = TMDB.getPreSeeded(title);
    if (pre?.poster) return pre.poster;
    return initialThumb || null;
  });

  const [isTmdbEnhanced, setIsTmdbEnhanced] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [triedTmdb, setTriedTmdb] = useState(false);

  const views = item.post_views;
  const rating = item.post_rate;
  const epCount = item.post_episodes_count || (Array.isArray(item.post_episodes) ? item.post_episodes.length : null);
  const bookmarked = isSaved(id);

  // If initial thumbnail is missing or is from known broken host, look up TMDB
  useEffect(() => {
    let isMounted = true;

    // Check pre-seed immediately
    const pre = TMDB.getPreSeeded(title);
    if (pre?.poster) {
      setActiveImage(pre.poster);
      setIsTmdbEnhanced(true);
      return;
    }

    if (!activeImage && !triedTmdb) {
      setTriedTmdb(true);
      TMDB.lookup(title).then((res) => {
        if (!isMounted) return;
        if (res?.poster) {
          setActiveImage(res.poster);
          setIsTmdbEnhanced(true);
        } else {
          setHasFailed(true);
          onImageError?.();
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [title, activeImage, triedTmdb, onImageError]);

  const handleImageError = () => {
    // If the current image failed and we haven't tried TMDB yet, try TMDB!
    if (!triedTmdb) {
      setTriedTmdb(true);
      TMDB.lookup(title).then((res) => {
        if (res?.poster && res.poster !== activeImage) {
          setActiveImage(res.poster);
          setIsTmdbEnhanced(true);
        } else {
          setHasFailed(true);
          onImageError?.();
        }
      });
    } else {
      setHasFailed(true);
      onImageError?.();
    }
  };

  // If this item is in featured shelves and has no valid image, remove it from featured!
  if (isFeatured && hasFailed) {
    return null;
  }

  const formatViews = (val?: string | number) => {
    if (!val) return null;
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return String(num);
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist({
      seriesId: id,
      title,
      thumbnail: activeImage || initialThumb,
      episodesCount: epCount ? Number(epCount) : undefined,
      rating,
      views
    });
  };

  return (
    <div className={`group relative flex flex-col ${className}`}>
      {/* Poster Media Box with Modern 2:3 Cinematic Ratio */}
      <a
        href={`#/series/${id}`}
        className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-carbon-900 border border-white/[0.07] group-hover:border-white/20 transition-all duration-300 ease-out group-hover:-translate-y-1.5 block shadow-[0_8px_20px_rgba(0,0,0,0.6)] group-hover:shadow-[0_16px_32px_rgba(0,0,0,0.9)]"
      >
        {/* Poster Image */}
        {!hasFailed && activeImage ? (
          <img
            src={activeImage}
            alt={title}
            loading="lazy"
            onError={handleImageError}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-carbon-850/90 text-gray-400">
            <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-cinema-red mb-2">
              18+
            </span>
            <span className="text-xs font-bold text-gray-200 line-clamp-3 leading-snug">{title}</span>
          </div>
        )}

        {/* Multi-stop Cinematic Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-70 group-hover:opacity-85 transition-opacity duration-300" />

        {/* Top Badges Cluster: 18+ / Episode Count / TMDB / Rank */}
        <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5 z-10">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white/95 border border-white/10 backdrop-blur-md shadow-sm">
            18+
          </span>

          {showEpisodeBadge && epCount && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cinema-red text-white shadow-sm">
              {epCount} {Number(epCount) === 1 ? 'EP' : 'EPS'}
            </span>
          )}

          {isTmdbEnhanced && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              <span>TMDB</span>
            </span>
          )}
        </div>

        {/* Floating Rank Badge (if provided) */}
        {rank !== undefined && (
          <div className="absolute top-2 left-2 z-20 w-7 h-7 rounded-lg bg-black/80 border border-white/20 text-white font-black text-sm flex items-center justify-center shadow-lg">
            {rank}
          </div>
        )}

        {/* Bookmark Quick Action Button */}
        <button
          onClick={handleBookmarkClick}
          className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-md transition-all duration-200 z-10 ${
            bookmarked
              ? 'bg-cinema-red text-white shadow-md'
              : 'bg-black/50 text-gray-300 hover:text-white hover:bg-black/80 border border-white/10 opacity-0 group-hover:opacity-100'
          }`}
          title={bookmarked ? 'Remove from My List' : 'Add to My List'}
          aria-label={bookmarked ? 'Remove from My List' : 'Add to My List'}
        >
          <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Hover Center Play Button with Pop Animation */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-cinema-red text-white flex items-center justify-center shadow-xl shadow-red-950/60 transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-out">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Bottom Metadata Pills */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-gray-300 z-10 pointer-events-none">
          {rating ? (
            <div className="flex items-center gap-1 text-amber-300 font-semibold bg-black/60 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-md shadow-sm">
              <Star className="w-3 h-3 fill-amber-300" />
              <span>{rating}</span>
            </div>
          ) : <div />}

          {views && (
            <div className="flex items-center gap-1 text-gray-300 bg-black/60 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-md shadow-sm">
              <Eye className="w-3 h-3 text-gray-400" />
              <span>{formatViews(views)}</span>
            </div>
          )}
        </div>
      </a>

      {/* Series Title */}
      <a
        href={`#/series/${id}`}
        className="mt-2 text-xs sm:text-sm font-semibold text-gray-200 group-hover:text-white transition-colors line-clamp-2 leading-snug"
        title={title}
      >
        {title}
      </a>
    </div>
  );
};
