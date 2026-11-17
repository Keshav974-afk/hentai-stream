import React, { useEffect, useState } from 'react';
import { HentaiItem, Episode } from '../types/api';
import { API } from '../services/api';
import { TMDB, TmdbMediaInfo } from '../services/tmdb';
import { VideoPlayer } from '../components/VideoPlayer';
import { AnimeCard } from '../components/AnimeCard';
import { DownloadModal } from '../components/DownloadModal';
import { EpisodeThumbnail, getEpisodePreviewUrl } from '../components/EpisodeThumbnail';
import { useWatchlist, useWatchHistory } from '../hooks/useLocalStorage';
import { Sparkles, Clock, Calendar, Film } from 'lucide-react';

interface WatchPageProps {
  seriesId: string | number;
  episodeId?: string | number;
}

export const WatchPage: React.FC<WatchPageProps> = ({ seriesId, episodeId }) => {
  const [series, setSeries] = useState<HentaiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [recommendations, setRecommendations] = useState<HentaiItem[]>([]);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [tmdbData, setTmdbData] = useState<TmdbMediaInfo | null>(null);

  const { isSaved, toggleWatchlist } = useWatchlist();
  const { getProgress } = useWatchHistory();

  // 1. Fetch series data
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

  // Derive episode list and selected episode
  const episodes: Episode[] = Array.isArray(series?.post_episodes)
    ? series!.post_episodes!
    : Array.isArray(series?.episodes)
    ? series!.episodes!
    : [];

  let epIndex = episodes.findIndex((e) => String(e.chapter_id) === String(episodeId));
  if (epIndex < 0 && episodes.length > 0) {
    const saved = getProgress(seriesId);
    if (saved) {
      epIndex = episodes.findIndex((e) => String(e.chapter_id) === String(saved.chapterId));
    }
    if (epIndex < 0) epIndex = 0;
  }

  const currentEp = episodes[epIndex];
  const activeChapterId = currentEp?.chapter_id;

  const savedProgress = getProgress(seriesId, activeChapterId);
  const initialStartTime = savedProgress && savedProgress.currentTime > 10 && savedProgress.currentTime < (savedProgress.duration - 15)
    ? savedProgress.currentTime
    : 0;

  // 2. Fetch specific episode stream if chapter_content is missing
  useEffect(() => {
    if (currentEp && !currentEp.chapter_content && seriesId && activeChapterId) {
      API.getEpisode(seriesId, activeChapterId).then((epData) => {
        if (epData && epData.chapter_content) {
          setSeries((prev) => {
            if (!prev) return prev;
            const updated = (prev.post_episodes || []).map((e) =>
              String(e.chapter_id) === String(activeChapterId)
                ? { ...e, chapter_content: epData.chapter_content }
                : e
            );
            return { ...prev, post_episodes: updated };
          });
        }
      }).catch(() => {});
    }
  }, [activeChapterId, seriesId, currentEp]);

  // 3. Enrich with TMDB episode details & stills
  useEffect(() => {
    if (!series) return;
    const title = series.post_title || '';
    const altTitle = series.post_title_alternative || (series as any).alternative_title || '';

    // Check pre-seed immediately
    const pre = TMDB.getPreSeeded(title);
    if (pre) {
      setTmdbData(pre);
    }

    // Comprehensive TMDB lookup with full episode data
    TMDB.lookup(title, true, altTitle).then((res) => {
      if (res) {
        setTmdbData(res);
      }
    });
  }, [series]);

  // Conditional Rendering
  if (loading) {
    return (
      <div className="pt-20 max-w-[1500px] mx-auto px-3 sm:px-6 space-y-4 animate-pulse select-none">
        <div className="h-6 w-48 bg-carbon-800 rounded" />
        <div className="w-full aspect-video bg-carbon-850 rounded-2xl shimmer" />
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-20 select-none">
        <h2 className="text-xl font-bold text-white mb-2">Video Stream Failed</h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-6">{error || 'Episode could not be retrieved.'}</p>
        <a
          href={`#/series/${seriesId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] text-white font-semibold text-xs transition"
        >
          <span>Back to Series Details</span>
        </a>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-20 select-none">
        <h2 className="text-xl font-bold text-white mb-2">No Episodes Available</h2>
        <a
          href={`#/series/${seriesId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] text-white font-semibold text-xs transition"
        >
          <span>Back to Series</span>
        </a>
      </div>
    );
  }

  const title = series.post_title || 'Untitled';
  const hasNext = epIndex + 1 < episodes.length;
  const hasPrev = epIndex > 0;
  const bookmarked = isSaved(seriesId);

  // Match active episode with TMDB episode info
  const tmdbEpisodes = tmdbData?.episodes || [];
  const activeTmdbEp = tmdbEpisodes.find((te) => te.episode_number === epIndex + 1) || tmdbEpisodes[epIndex];
  const epTitle = activeTmdbEp?.name || currentEp?.chapter_name || `Episode ${epIndex + 1}`;
  const epSynopsis = activeTmdbEp?.overview || series.post_content?.replace(/<[^>]*>/g, '').trim() || '';
  const epStill = activeTmdbEp?.still || tmdbData?.backdrop || series.post_thumbnail;

  const handleSelectEpisode = (idx: number) => {
    const next = episodes[idx];
    if (next) {
      window.location.hash = `#/watch/${seriesId}/${next.chapter_id}`;
    }
  };

  const handleNextEpisode = () => {
    if (hasNext) {
      handleSelectEpisode(epIndex + 1);
    }
  };

  const handlePrevEpisode = () => {
    if (hasPrev) {
      handleSelectEpisode(epIndex - 1);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Episode link copied to clipboard!');
  };

  const handleDownload = () => {
    setShowDownloadModal(true);
  };

  return (
    <div className="pb-16 pt-16 sm:pt-20 select-none">
      <div
        id="player-container"
        className={`mx-auto space-y-4 transition-all duration-300 ${
          isTheaterMode ? 'w-full px-0' : 'max-w-[1500px] px-2 sm:px-6'
        }`}
      >
        {/* Desktop Breadcrumb Bar */}
        <div className="hidden sm:flex items-center justify-between text-xs text-zinc-400 px-1">
          <a
            href={`#/series/${seriesId}`}
            className="flex items-center gap-1.5 hover:text-white transition font-semibold"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span className="truncate max-w-md">Back to {title}</span>
          </a>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className="hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="2"/>
              </svg>
              <span>{isTheaterMode ? 'Default View' : 'Theater Mode'}</span>
            </button>
            <span>Episode {epIndex + 1} of {episodes.length}</span>
          </div>
        </div>

        {/* Video Player */}
        <VideoPlayer
          streamUrl={currentEp.chapter_content}
          seriesId={seriesId}
          seriesTitle={title}
          episode={currentEp}
          episodeIndex={epIndex}
          totalEpisodes={episodes.length}
          episodes={episodes}
          onSelectEpisode={handleSelectEpisode}
          onNextEpisode={hasNext ? handleNextEpisode : undefined}
          onPrevEpisode={hasPrev ? handlePrevEpisode : undefined}
          isTheaterMode={isTheaterMode}
          onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
          onBack={() => { window.location.hash = `#/series/${seriesId}`; }}
          poster={epStill}
          startTime={initialStartTime}
        />
      </div>

      {/* Main Details and Episodes Grid Container */}
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 mt-6 space-y-6">

        {/* Video Metadata & Action Bar Box - Clean obsidian card without glows */}
        <div className="bg-carbon-900 border border-white/10 rounded-2xl p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E50914] text-white uppercase">
                Now Streaming
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-zinc-300">
                1080p FHD
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-zinc-300">
                Episode {epIndex + 1} of {episodes.length}
              </span>
              {activeTmdbEp?.runtime && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-zinc-300 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-zinc-400" />
                  <span>{activeTmdbEp.runtime}m</span>
                </span>
              )}
              {activeTmdbEp?.air_date && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-zinc-400 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5 text-zinc-500" />
                  <span>{activeTmdbEp.air_date}</span>
                </span>
              )}
              {activeTmdbEp && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-zinc-400" />
                  <span>TMDB Verified</span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              {title} <span className="text-[#E50914] font-semibold">· {epTitle}</span>
            </h2>

            {epSynopsis && (
              <div>
                <p className={`text-xs sm:text-sm text-zinc-300 leading-relaxed ${synopsisExpanded ? '' : 'line-clamp-3'}`}>
                  {epSynopsis}
                </p>
                {epSynopsis.length > 180 && (
                  <button
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                    className="text-xs font-semibold text-[#E50914] hover:underline mt-1 cursor-pointer"
                  >
                    {synopsisExpanded ? 'Show less' : 'More synopsis'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons (Download, My List, Share) */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2.5 lg:border-l lg:border-white/10 lg:pl-6 content-center">
            <button
              onClick={handleDownload}
              className="vf-action-btn cursor-pointer"
              title="Download Full Episode"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              <span>Download</span>
            </button>

            <button
              onClick={() => toggleWatchlist({
                seriesId,
                title,
                thumbnail: epStill || series.post_thumbnail || '',
                episodesCount: episodes.length,
                rating: series.post_rate,
                views: series.post_views
              })}
              className={`vf-action-btn ${bookmarked ? 'border-zinc-500 bg-white/15 text-white' : ''}`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
              </svg>
              <span>{bookmarked ? 'In List' : 'My List'}</span>
            </button>

            <button
              onClick={copyShareLink}
              className="vf-action-btn"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* All Episodes Grid Section with TMDB Stills & Titles */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 px-1">
            <h3 className="font-bold text-base sm:text-lg text-white flex items-center">
              <span className="w-1.5 h-5 rounded-full bg-[#E50914] inline-block mr-2.5" />
              All Episodes <span className="text-zinc-400 font-semibold ml-1.5">({episodes.length})</span>
            </h3>
            <a
              href={`#/series/${seriesId}`}
              className="text-xs text-zinc-400 hover:text-white font-semibold flex items-center gap-1 px-3 py-1 rounded-full hover:bg-white/10 transition"
            >
              <span>Series Details</span>
              <span>›</span>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {episodes.map((e, idx) => {
              const active = idx === epIndex;
              const epNum = idx + 1;
              const tmdbEp = tmdbEpisodes.find((te) => te.episode_number === epNum) || tmdbEpisodes[idx];
              const stillThumb = tmdbEp?.still || tmdbData?.backdrop || e.chapter_thumbnail || series.post_thumbnail;
              const name = tmdbEp?.name || e.chapter_name || `Episode ${epNum}`;
              const runtime = tmdbEp?.runtime ? `${tmdbEp.runtime}m` : '1080p FHD';
              const previewUrl = getEpisodePreviewUrl(e);

              return (
                <button
                  key={e.chapter_id || idx}
                  onClick={() => handleSelectEpisode(idx)}
                  className={`text-left flex sm:flex-col gap-3 sm:gap-0 rounded-xl overflow-hidden bg-carbon-850 border transition-all active:scale-[0.98] cursor-pointer ${
                    active
                      ? 'border-white ring-1 ring-white/50 bg-zinc-800/90'
                      : 'border-white/10 hover:border-white/25 hover:bg-carbon-800'
                  }`}
                >
                  <EpisodeThumbnail
                    poster={stillThumb}
                    alt={name}
                    previewUrl={previewUrl}
                    className="w-32 sm:w-full aspect-video flex-shrink-0"
                  >
                    <span className="absolute bottom-1.5 left-1.5 text-[9px] bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded font-bold text-white border border-white/10 z-20">
                      EP {epNum}
                    </span>
                    {active && (
                      <span className="absolute top-1.5 left-1.5 text-[9px] bg-white text-zinc-950 px-2 py-0.5 rounded font-extrabold uppercase z-20 shadow-sm">
                        Now Playing
                      </span>
                    )}
                  </EpisodeThumbnail>

                  <div className="p-2.5 sm:p-3 min-w-0 flex flex-col justify-center flex-1">
                    <p className={`font-semibold text-xs sm:text-sm truncate ${active ? 'text-white font-bold' : 'text-zinc-200'}`}>
                      {name}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-0.5">
                      {runtime} · Master Stream
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Recommendations Grid */}
        {recommendations.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="font-bold text-base sm:text-lg text-white flex items-center">
              <Film className="w-4 h-4 text-[#E50914] mr-2" />
              More Like This
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
              {recommendations.map((item) => (
                <AnimeCard key={item.post_ID || item.id} item={item} isFeatured={true} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Full Episode Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        streamUrl={currentEp?.chapter_content || ''}
        seriesTitle={title}
        episodeTitle={epTitle}
      />
    </div>
  );
};
