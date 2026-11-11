import React, { useState } from 'react';
import { Play, Bookmark, Star, Eye } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { useWatchlist } from '../hooks/useLocalStorage';

interface AnimeCardProps {
  item: HentaiItem;
  rank?: number;
  className?: string;
  showEpisodeBadge?: boolean;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  item,
  rank,
  className = '',
  showEpisodeBadge = true,
}) => {
  const [imageError, setImageError] = useState(false);
  const { isSaved, toggleWatchlist } = useWatchlist();

  const id = item.post_ID || item.id || '';
  const title = item.post_title || 'Untitled';
  const thumbnail = item.post_thumbnail || '';
  const views = item.post_views;
  const rating = item.post_rate;
  const epCount = item.post_episodes_count || (Array.isArray(item.post_episodes) ? item.post_episodes.length : null);
  const bookmarked = isSaved(id);

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
      thumbnail,
      episodesCount: epCount ? Number(epCount) : undefined,
      rating,
      views
    });
  };

  return (
    <div className={`group relative flex flex-col ${className}`}>
      {/* Poster Media Box */}
      <a
        href={`#/series/${id}`}
        className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-carbon-850 border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-1 block shadow-md group-hover:shadow-2xl"
      >
        {/* Poster Image */}
        {!imageError && thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-carbon-850 text-gray-500">
            <span className="text-xs font-semibold text-gray-400">Voidflix Cinema</span>
            <span className="text-[11px] text-gray-500 mt-1 line-clamp-2">{title}</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-carbon-950/90 via-transparent to-black/20 opacity-70 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges: HD / 18+ / Episode Count */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-carbon-950/80 text-gray-200 border border-white/10 backdrop-blur-sm">
            18+
          </span>
          {showEpisodeBadge && epCount && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cinema-red text-white">
              {epCount} {Number(epCount) === 1 ? 'EP' : 'EPS'}
            </span>
          )}
        </div>

        {/* Bookmark Action */}
        <button
          onClick={handleBookmarkClick}
          className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-md transition z-10 ${
            bookmarked
              ? 'bg-cinema-red text-white'
              : 'bg-carbon-950/70 text-gray-300 hover:text-white hover:bg-carbon-950 border border-white/10'
          }`}
          title={bookmarked ? 'Remove from My List' : 'Add to My List'}
          aria-label={bookmarked ? 'Remove from My List' : 'Add to My List'}
        >
          <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Center Hover Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-cinema-red flex items-center justify-center text-white transform scale-75 group-hover:scale-100 transition-transform shadow-lg">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Bottom Metadata Pills */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-gray-300 z-10">
          {rating ? (
            <div className="flex items-center gap-1 text-amber-400 font-semibold bg-carbon-950/70 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{rating}</span>
            </div>
          ) : <div />}

          {views && (
            <div className="flex items-center gap-1 text-gray-400 bg-carbon-950/70 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm">
              <Eye className="w-3 h-3 text-gray-400" />
              <span>{formatViews(views)}</span>
            </div>
          )}
        </div>
      </a>

      {/* Title */}
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
