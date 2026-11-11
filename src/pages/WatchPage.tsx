import React, { useEffect, useState } from 'react';
import { HentaiItem, Episode } from '../types/api';
import { API } from '../services/api';
import { VideoPlayer } from '../components/VideoPlayer';
import { AnimeCard } from '../components/AnimeCard';
import { useWatchHistory } from '../hooks/useLocalStorage';
import { ChevronLeft, Play, Layers, Sparkles, RefreshCw, Star, Eye } from 'lucide-react';

interface WatchPageProps {
  seriesId: string | number;
  episodeId: string | number;
}

export const WatchPage: React.FC<WatchPageProps> = ({ seriesId, episodeId }) => {
  const [series, setSeries] = useState<HentaiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [recommendations, setRecommendations] = useState<HentaiItem[]>([]);

  const { getProgress } = useWatchHistory();

  useEffect(() => {
    let isMounted = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const loadStream = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await API.getSeries(seriesId);
        if (isMounted) {
          setSeries(data);
          // Recommendations
          const tag = data.taxonomies?.[0]?.name || 'uncensored';
          API.search(tag).then((recs) => {
            if (isMounted) {
              setRecommendations(recs.filter((r) => String(r.post_ID || r.id) !== String(seriesId)).slice(0, 8));
            }
          }).catch(() => {});
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load video stream');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStream();
    return () => {
      isMounted = false;
    };
  }, [seriesId, episodeId]);

  if (loading) {
    return (
      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-carbon-800 rounded" />
        <div className="w-full aspect-video bg-carbon-850 rounded-2xl" />
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-20">
        <h2 className="text-xl font-bold text-white mb-2">Video Stream Failed</h2>
        <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-6">{error || 'Episode could not be retrieved.'}</p>
        <a
          href={`#/series/${seriesId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cinema-red text-white font-semibold text-xs transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Series Details</span>
        </a>
      </div>
    );
  }

  const episodes: Episode[] = Array.isArray(series.post_episodes)
    ? series.post_episodes
    : Array.isArray(series.episodes)
    ? series.episodes
    : [];

  const episodeIndex = episodes.findIndex((e) => String(e.chapter_id) === String(episodeId));
  const activeIndex = episodeIndex >= 0 ? episodeIndex : 0;
  const currentEp = episodes[activeIndex];

  if (!currentEp) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-20">
        <h2 className="text-xl font-bold text-white mb-2">Episode Unavailable</h2>
        <a
          href={`#/series/${seriesId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cinema-red text-white font-semibold text-xs transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Series</span>
        </a>
      </div>
    );
  }

  const title = series.post_title || 'Untitled';
  const hasNext = activeIndex + 1 < episodes.length;
  const hasPrev = activeIndex > 0;

  const handleSelectEpisode = (idx: number) => {
    const next = episodes[idx];
    if (next) {
      window.location.hash = `#/watch/${seriesId}/${next.chapter_id}`;
    }
  };

  const handleNextEpisode = () => {
    if (hasNext) {
      handleSelectEpisode(activeIndex + 1);
    }
  };

  const handlePrevEpisode = () => {
    if (hasPrev) {
      handleSelectEpisode(activeIndex - 1);
    }
  };

  return (
    <div className="pb-16 pt-16 sm:pt-20">
      <div className={`${isTheaterMode ? 'w-full px-0 sm:px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'} space-y-4`}>
        {/* Desktop Breadcrumb Bar */}
        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
          <a
            href={`#/series/${seriesId}`}
            className="flex items-center gap-1.5 hover:text-white transition font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="truncate max-w-xs sm:max-w-md">{title}</span>
          </a>

          <div className="flex items-center gap-2 text-gray-400">
            <span>
              Episode {activeIndex + 1} of {episodes.length}
            </span>
          </div>
        </div>

        {/* Video Player */}
        <VideoPlayer
          streamUrl={currentEp.chapter_content}
          seriesId={seriesId}
          seriesTitle={title}
          episode={currentEp}
          episodeIndex={activeIndex}
          totalEpisodes={episodes.length}
          episodes={episodes}
          onSelectEpisode={handleSelectEpisode}
          onNextEpisode={hasNext ? handleNextEpisode : undefined}
          onPrevEpisode={hasPrev ? handlePrevEpisode : undefined}
          isTheaterMode={isTheaterMode}
          onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
        />
      </div>

      {/* Main Details and Episodes Grid Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-8">
        {/* Episode Info Strip */}
        <div className="bg-carbon-900 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-cinema-red uppercase tracking-wider block">
                Now Playing
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-white mt-0.5">
                {currentEp.chapter_name || `Episode ${activeIndex + 1}`}
              </h2>
            </div>

            {/* Next Episode CTA */}
            {hasNext && (
              <button
                onClick={handleNextEpisode}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition self-start sm:self-auto"
              >
                <span>Next Episode</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>

          {/* Series description preview */}
          {series.post_content && (
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-4xl pt-2 border-t border-white/5 line-clamp-3">
              {series.post_content.replace(/<[^>]*>/g, '')}
            </p>
          )}
        </div>

        {/* All Episodes Shelf */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cinema-red" />
              <span>All Episodes</span>
              <span className="text-xs font-semibold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {episodes.length}
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {episodes.map((ep, idx) => {
              const active = idx === activeIndex;
              const epProgress = getProgress(seriesId, ep.chapter_id);
              const progressPct = epProgress && epProgress.duration > 0
                ? Math.min(100, (epProgress.currentTime / epProgress.duration) * 100)
                : 0;

              return (
                <button
                  key={ep.chapter_id || idx}
                  onClick={() => handleSelectEpisode(idx)}
                  className={`text-left group rounded-xl overflow-hidden border transition-all duration-200 block ${
                    active
                      ? 'bg-carbon-850 border-cinema-red ring-1 ring-cinema-red'
                      : 'bg-carbon-900 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="relative aspect-video w-full bg-carbon-850 overflow-hidden">
                    <img
                      src={ep.chapter_thumbnail || series.post_thumbnail}
                      alt={ep.chapter_name || `Episode ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-carbon-950/80 text-white border border-white/10 backdrop-blur-sm">
                      EP {idx + 1}
                    </div>
                    {progressPct > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div
                          className="h-full bg-cinema-red"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h4 className={`text-xs font-bold truncate ${active ? 'text-cinema-red' : 'text-gray-200 group-hover:text-white'}`}>
                      {ep.chapter_name || `Episode ${idx + 1}`}
                    </h4>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="space-y-4 pt-4">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cinema-red" />
              <span>Recommended For You</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
              {recommendations.map((item) => (
                <AnimeCard key={item.post_ID || item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
