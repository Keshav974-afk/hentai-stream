import React, { useEffect, useState } from 'react';
import { X, Play, Plus, Check, Star, Clock, Calendar, Film, Sparkles } from 'lucide-react';
import { HentaiItem, Episode } from '../types/api';
import { API } from '../services/api';
import { TMDB, TmdbMediaInfo } from '../services/tmdb';
import { useWatchlist, useWatchHistory } from '../hooks/useLocalStorage';
import { EpisodeThumbnail, getEpisodePreviewUrl } from './EpisodeThumbnail';

interface DetailModalProps {
  item: HentaiItem | null;
  onClose: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ item, onClose }) => {
  const [fullSeries, setFullSeries] = useState<HentaiItem | null>(null);
  const [tmdbData, setTmdbData] = useState<TmdbMediaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const { isSaved, toggleWatchlist } = useWatchlist();
  const { getProgress } = useWatchHistory();

  const id = item?.post_ID || item?.id || '';
  const title = item?.post_title || (item as any)?.title || 'Untitled';
  const bookmarked = id ? isSaved(id) : false;

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [item]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch full series details and TMDB data
  useEffect(() => {
    if (!item || !id) return;
    setLoading(true);

    // Fetch API details
    API.getSeries(id)
      .then((data) => setFullSeries(data))
      .catch(() => setFullSeries(null))
      .finally(() => setLoading(false));

    // Fetch TMDB rich metadata & episodes
    const altTitle = item.post_title_alternative || (item as any).alternative_title || '';
    TMDB.lookup(title, true, altTitle).then((res) => {
      if (res) setTmdbData(res);
    });
  }, [item, id, title]);

  if (!item) return null;

  const episodes: Episode[] = fullSeries
    ? Array.isArray(fullSeries.post_episodes)
      ? fullSeries.post_episodes
      : Array.isArray(fullSeries.episodes)
      ? fullSeries.episodes
      : []
    : [];

  const backdrop = tmdbData?.backdrop || item.post_thumbnail || item.thumbnail || '';
  const poster = tmdbData?.poster || item.post_thumbnail || item.thumbnail || '';
  const synopsis = tmdbData?.overview || fullSeries?.post_content?.replace(/<[^>]*>/g, '').trim() || '';
  const rating = tmdbData?.vote_average ? String(tmdbData.vote_average.toFixed(1)) : item.post_rate;
  const genres = fullSeries?.taxonomies || [];
  const tmdbEpisodes = tmdbData?.episodes || [];

  const handleToggle = () => {
    toggleWatchlist({
      seriesId: id,
      title,
      thumbnail: poster,
      episodesCount: episodes.length,
      rating,
      views: item.post_views
    });
  };

  const playFirstEpisode = () => {
    const firstEpId = episodes[0]?.chapter_id;
    if (firstEpId) {
      window.location.hash = `#/watch/${id}/${firstEpId}`;
    } else {
      window.location.hash = `#/series/${id}`;
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-0 sm:p-4 md:p-6 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-none sm:rounded-2xl overflow-hidden bg-[#14151a] border border-white/10 shadow-2xl my-auto text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 size-9 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white grid place-items-center border border-white/15 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="size-5" />
        </button>

        {/* Billboard Hero Header */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900">
          <img
            src={backdrop || poster}
            alt={title}
            className="w-full h-full object-cover filter brightness-[0.45]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#14151a] via-[#14151a]/40 to-transparent" />

          {/* Overlaid Bottom Hero Elements */}
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 space-y-3">
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {title}
            </h1>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={playFirstEpisode}
                className="flex items-center gap-2 rounded-full bg-white hover:bg-white/90 text-black font-bold px-6 py-2.5 text-sm shadow-lg active:scale-95 transition cursor-pointer"
              >
                <Play className="size-4 fill-current ml-0.5" />
                <span>Play</span>
              </button>

              <button
                onClick={handleToggle}
                className="flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md px-5 py-2.5 text-sm font-semibold text-white border border-white/10 active:scale-95 transition cursor-pointer"
              >
                {bookmarked ? (
                  <>
                    <Check className="size-4 text-emerald-400" />
                    <span>In My List</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    <span>Add to List</span>
                  </>
                )}
              </button>

              <a
                href={`#/series/${id}`}
                onClick={onClose}
                className="ml-auto text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition"
              >
                <span>Full Details</span>
                <span>›</span>
              </a>
            </div>
          </div>
        </div>

        {/* Details Body */}
        <div className="p-5 sm:p-8 space-y-6">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-300">
            <span className="font-bold text-emerald-400">98% Match</span>
            {rating && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Star className="size-3 fill-amber-300" />
                {rating}
              </span>
            )}
            <span className="rounded-sm border border-white/20 bg-white/5 px-1.5 py-0.2 text-[10px] font-bold">
              18+
            </span>
            <span className="rounded-sm border border-white/20 bg-white/5 px-1.5 py-0.2 text-[10px] font-bold">
              HD
            </span>
            <span className="text-zinc-400">
              {episodes.length > 0 ? `${episodes.length} Episodes` : 'Series'}
            </span>
          </div>

          {/* Synopsis */}
          {synopsis && (
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl">
              {synopsis}
            </p>
          )}

          {/* Genre Tags */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {genres.map((g) => (
                <a
                  key={g.term_id}
                  href={`#/genres?id=${g.term_id}`}
                  onClick={onClose}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition"
                >
                  {g.name}
                </a>
              ))}
            </div>
          )}

          {/* Episodes List */}
          {episodes.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Film className="size-4 text-[#E50914]" />
                <span>Episodes ({episodes.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto hide-scrollbar pr-1">
                {episodes.map((ep, idx) => {
                  const epNum = idx + 1;
                  const tmdbEp = tmdbEpisodes.find((te) => te.episode_number === epNum) || tmdbEpisodes[idx];
                  const still = tmdbEp?.still || backdrop || ep.chapter_thumbnail || poster;
                  const epName = tmdbEp?.name || ep.chapter_name || `Episode ${epNum}`;
                  const runtime = tmdbEp?.runtime ? `${tmdbEp.runtime}m` : null;

                  const previewUrl = getEpisodePreviewUrl(ep);

                  return (
                    <a
                      key={ep.chapter_id || idx}
                      href={`#/watch/${id}/${ep.chapter_id}`}
                      onClick={onClose}
                      className="group flex gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 transition items-center"
                    >
                      <EpisodeThumbnail
                        poster={still}
                        alt={epName}
                        previewUrl={previewUrl}
                        className="w-24 sm:w-28 aspect-video rounded-lg flex-shrink-0"
                      >
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-black/80 text-white z-20">
                          EP {epNum}
                        </span>
                      </EpisodeThumbnail>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-white">
                          {epName}
                        </h4>
                        {runtime && (
                          <span className="text-[10px] text-zinc-400 mt-0.5 block">
                            {runtime} · 1080p
                          </span>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
