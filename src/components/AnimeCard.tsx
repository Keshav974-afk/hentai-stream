import React, { useState, useEffect } from 'react';
import { Play, Plus, Check, ChevronDown, ThumbsUp, Star } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { useWatchlist } from '../hooks/useLocalStorage';
import { TMDB, TmdbMediaInfo } from '../services/tmdb';

interface AnimeCardProps {
  item: HentaiItem;
  rank?: number;
  className?: string;
  isFeatured?: boolean;
  onMoreInfo?: (item: HentaiItem) => void;
  onImageError?: () => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  item,
  rank,
  className = '',
  isFeatured = false,
  onMoreInfo,
  onImageError,
}) => {
  const { isSaved, toggleWatchlist } = useWatchlist();

  const id = item.post_ID || item.id || '';
  const title = item.post_title || (item as any).title || 'Untitled';
  const altTitle = item.post_title_alternative || (item as any).alternative_title || '';
  const rawThumbnail = item.post_thumbnail || item.thumbnail || (item as any).cover || '';
  const initialThumb = rawThumbnail ? rawThumbnail.replace(/ /g, '%20') : '';

  const [tmdb, setTmdb] = useState<TmdbMediaInfo | null>(() => TMDB.getPreSeeded(title));
  const [activePoster, setActivePoster] = useState<string | null>(() => tmdb?.poster || initialThumb || null);
  const [activeBackdrop, setActiveBackdrop] = useState<string | null>(() => tmdb?.backdrop || initialThumb || null);
  const [hasFailed, setHasFailed] = useState(false);
  const [triedTmdb, setTriedTmdb] = useState(false);
  const [liked, setLiked] = useState(false);

  const epCount = item.post_episodes_count || (Array.isArray(item.post_episodes) ? item.post_episodes.length : null);
  const rating = tmdb?.vote_average ? String(tmdb.vote_average.toFixed(1)) : item.post_rate;
  const bookmarked = isSaved(id);

  // Dynamic TMDB lookup
  useEffect(() => {
    let isMounted = true;
    if (!tmdb && !triedTmdb) {
      setTriedTmdb(true);
      TMDB.lookup(title, false, altTitle).then((res) => {
        if (!isMounted) return;
        if (res) {
          setTmdb(res);
          if (res.poster) setActivePoster(res.poster);
          if (res.backdrop) setActiveBackdrop(res.backdrop);
        } else if (!activePoster) {
          setHasFailed(true);
          onImageError?.();
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [title, altTitle, tmdb, triedTmdb, activePoster, onImageError]);

  const handleImageError = () => {
    if (!triedTmdb) {
      setTriedTmdb(true);
      TMDB.lookup(title, false, altTitle).then((res) => {
        if (res?.poster) {
          setTmdb(res);
          setActivePoster(res.poster);
          if (res.backdrop) setActiveBackdrop(res.backdrop);
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

  // If item is featured and image cannot be loaded, remove it from shelf
  if (isFeatured && hasFailed) {
    return null;
  }

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.hash = `#/series/${id}`;
  };

  const handleToggleList = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWatchlist({
      seriesId: id,
      title,
      thumbnail: activePoster || initialThumb,
      episodesCount: epCount ? Number(epCount) : undefined,
      rating,
      views: item.post_views
    });
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
  };

  const handleCardClick = () => {
    if (onMoreInfo) {
      onMoreInfo(item);
    } else {
      window.location.hash = `#/series/${id}`;
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      className={`group relative w-full aspect-[2/3] md:aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-[#181818] border border-white/10 cursor-pointer transition-all duration-300 ease-out hover:scale-105 sm:hover:scale-110 hover:z-30 hover:shadow-2xl hover:shadow-black/95 select-none text-left ${className}`}
    >
      {/* Responsive Image: Portrait poster on mobile, 16:9 Landscape backdrop on desktop */}
      {!hasFailed && (activePoster || activeBackdrop) ? (
        <picture className="w-full h-full block">
          {activeBackdrop && (
            <source
              media="(min-width: 768px)"
              srcSet={activeBackdrop}
            />
          )}
          <img
            src={activePoster || activeBackdrop || ''}
            alt={title}
            loading="lazy"
            onError={handleImageError}
            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
          />
        </picture>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-900 text-zinc-400">
          <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-[#E50914] mb-1">
            18+
          </span>
          <span className="text-xs font-bold text-zinc-200 line-clamp-2">{title}</span>
        </div>
      )}

      {/* Floating Rank Badge (if provided) */}
      {rank !== undefined && (
        <div className="absolute top-2 left-2 z-20 w-7 h-7 rounded-lg bg-black/85 border border-white/20 text-white font-black text-xs flex items-center justify-center shadow-lg">
          {rank}
        </div>
      )}

      {/* Default Card Bottom Gradient + Title & Badges Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-2 sm:p-2.5 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-opacity group-hover:opacity-0">
        <div className="text-xs sm:text-[13px] font-bold text-white line-clamp-1 drop-shadow">
          {title}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 mt-1">
          <span className="rounded-sm bg-[#E50914] px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider leading-none">
            {epCount ? `${epCount} EPS` : 'NEW EPISODE'}
          </span>
          <span className="rounded-sm bg-white px-1.5 py-0.5 text-[9px] font-bold text-black uppercase tracking-wider leading-none">
            Watch Now
          </span>
        </div>
      </div>

      {/* FlowFlix Signature Netflix Hover Overlay Card on Desktop */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 sm:p-3 gap-1.5 z-20 pointer-events-none">
        {/* Title */}
        <div className="text-xs sm:text-sm font-bold text-white line-clamp-1 drop-shadow">
          {title}
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-1.5 pt-0.5 pointer-events-auto">
          {/* White Circular Play Button */}
          <button
            onClick={handlePlay}
            className="size-7 sm:size-8 rounded-full bg-white text-black grid place-items-center hover:bg-white/90 active:scale-95 transition shadow-lg cursor-pointer"
            aria-label={`Play ${title}`}
            title="Play"
          >
            <Play className="size-3.5 sm:size-4 fill-current translate-x-px" />
          </button>

          {/* Circle Add to List */}
          <button
            onClick={handleToggleList}
            className="size-7 sm:size-8 rounded-full border border-white/40 bg-black/60 hover:border-white hover:bg-black/80 text-white grid place-items-center active:scale-95 transition cursor-pointer"
            aria-label={bookmarked ? 'In My List' : 'Add to My List'}
            title={bookmarked ? 'In My List' : 'Add to My List'}
          >
            {bookmarked ? (
              <Check className="size-3.5 sm:size-4 text-emerald-400" />
            ) : (
              <Plus className="size-3.5 sm:size-4" />
            )}
          </button>

          {/* Circle Like */}
          <button
            onClick={handleToggleLike}
            className="size-7 sm:size-8 rounded-full border border-white/40 bg-black/60 hover:border-white hover:bg-black/80 text-white grid place-items-center active:scale-95 transition cursor-pointer"
            aria-label="Like"
            title="Like"
          >
            <ThumbsUp className={`size-3.5 sm:size-4 ${liked ? 'fill-white text-white' : ''}`} />
          </button>

          {/* Circle More Info Down Chevron (Far Right) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="size-7 sm:size-8 ml-auto rounded-full border border-white/40 bg-black/60 hover:border-white hover:bg-black/80 text-white grid place-items-center active:scale-95 transition cursor-pointer"
            aria-label="More Info"
            title="More Info"
          >
            <ChevronDown className="size-3.5 sm:size-4" />
          </button>
        </div>

        {/* Subtitle / Genre / Match Line */}
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-white/80 pt-0.5">
          <span className="font-semibold text-emerald-400">98% match</span>
          {rating && (
            <span className="flex items-center gap-0.5 font-bold text-amber-300">
              <Star className="size-2.5 fill-amber-300" />
              {rating}
            </span>
          )}
          <span className="rounded-sm border border-white/30 px-1 py-0.2 text-[9px] font-bold text-white/90 leading-none">
            HD
          </span>
          <span className="rounded-sm border border-white/30 px-1 py-0.2 text-[9px] font-bold text-white/90 leading-none">
            18+
          </span>
        </div>
      </div>
    </div>
  );
};
