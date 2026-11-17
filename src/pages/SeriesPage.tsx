import React, { useEffect, useState } from 'react';
import { HentaiItem, Episode } from '../types/api';
import { API } from '../services/api';
import { TMDB, TmdbMediaInfo } from '../services/tmdb';
import { AnimeCard } from '../components/AnimeCard';
import { EpisodeThumbnail, getEpisodePreviewUrl } from '../components/EpisodeThumbnail';
import { useWatchlist, useWatchHistory } from '../hooks/useLocalStorage';
import { Play, Bookmark, Star, Eye, Calendar, Sparkles, ArrowLeft, Film, Clock } from 'lucide-react';

interface SeriesPageProps {
  seriesId: string | number;
}

export const SeriesPage: React.FC<SeriesPageProps> = ({ seriesId }) => {
  const [series, setSeries] = useState<HentaiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<HentaiItem[]>([]);
  const [activePoster, setActivePoster] = useState<string | null>(null);
  const [activeBackdrop, setActiveBackdrop] = useState<string | null>(null);
  const [tmdbData, setTmdbData] = useState<TmdbMediaInfo | null>(null);

  const { isSaved, toggleWatchlist } = useWatchlist();
  const { getProgress } = useWatchHistory();

  useEffect(() => {
    let isMounted = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const fetchSeries = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await API.getSeries(seriesId);
        if (isMounted) {
          setSeries(data);
          const tag = data.taxonomies?.[0]?.name || 'harem';
          API.search(tag).then((recs) => {
            if (isMounted) {
              setRecommendations(recs.filter((r) => String(r.post_ID || r.id) !== String(seriesId)).slice(0, 10));
            }
          }).catch(() => {});
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load series details');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSeries();
    return () => {
      isMounted = false;
    };
  }, [seriesId]);

  // TMDB Poster, Backdrop & Episode Enrichment
  useEffect(() => {
    if (!series) return;
    const title = series.post_title || '';
    const raw = series.post_thumbnail || series.thumbnail || '';
    const initial = raw ? raw.replace(/ /g, '%20') : null;

    setActivePoster(initial);
    setActiveBackdrop(initial);

    // Check pre-seeded match first for instant backdrop/poster
    const pre = TMDB.getPreSeeded(title);
    if (pre) {
      if (pre.poster) setActivePoster(pre.poster);
      if (pre.backdrop) setActiveBackdrop(pre.backdrop);
      setTmdbData(pre);
    }

    // Comprehensive TMDB lookup with full episode data
    const altTitle = series.post_title_alternative || (series as any).alternative_title || '';
    TMDB.lookup(title, true, altTitle).then((res) => {
      if (res) {
        setTmdbData(res);
        if (res.poster) setActivePoster(res.poster);
        if (res.backdrop) setActiveBackdrop(res.backdrop);
      }
    });
  }, [series]);

  if (loading) {
    return (
      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-pulse select-none">
        <div className="w-full aspect-[21/9] min-h-[300px] bg-carbon-850 rounded-2xl" />
        <div className="space-y-4">
          <div className="h-8 w-64 bg-carbon-800 rounded" />
          <div className="h-4 w-96 bg-carbon-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-20 select-none">
        <h2 className="text-xl font-bold text-white mb-2">Series Unavailable</h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-6">{error || 'Series not found.'}</p>
        <a
          href="#/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] text-white font-semibold text-xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </a>
      </div>
    );
  }

  const id = series.post_ID || series.id || seriesId;
  const title = series.post_title || 'Untitled';
  const altTitle = series.post_title_alternative;
  const thumbnail = series.post_thumbnail || '';
  const wpSynopsis = series.post_content?.replace(/<[^>]*>/g, '').trim() || '';
  const synopsis = tmdbData?.overview || wpSynopsis;
  const episodes: Episode[] = Array.isArray(series.post_episodes)
    ? series.post_episodes
    : Array.isArray(series.episodes)
    ? series.episodes
    : [];
  const genres = Array.isArray(series.taxonomies) ? series.taxonomies : [];
  const bookmarked = isSaved(id);

  // Resume bookmark from continue watching
  const savedItem = getProgress(id);
  const firstEpisodeId = episodes[0]?.chapter_id;
  const resumeEpisodeId = savedItem?.chapterId || firstEpisodeId;

  const handleToggleBookmark = () => {
    toggleWatchlist({
      seriesId: id,
      title,
      thumbnail: activePoster || thumbnail,
      episodesCount: episodes.length,
      rating: tmdbData?.vote_average ? String(tmdbData.vote_average.toFixed(1)) : series.post_rate,
      views: series.post_views
    });
  };

  const tmdbEpisodes = tmdbData?.episodes || [];

  return (
    <div className="pb-16 pt-16 sm:pt-20 select-none">
      {/* Backdrop Header - Clean cinematic gradient fade */}
      <div className="relative min-h-[380px] sm:min-h-[460px] w-full flex items-end overflow-hidden">
        {/* Background Backdrop Image */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img
            src={activeBackdrop || activePoster || thumbnail}
            alt={title}
            className="w-full h-full object-cover object-top filter brightness-[0.38] scale-102 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-carbon-950/90 via-carbon-950/40 to-transparent max-w-5xl" />
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            {/* Poster Card */}
            <div className="flex-none w-36 sm:w-48 lg:w-56 aspect-[2/3] rounded-2xl overflow-hidden bg-carbon-850 border border-white/10 shadow-2xl relative">
              <img
                src={activePoster || thumbnail}
                alt={title}
                onError={() => {
                  if (!tmdbData) {
                    TMDB.lookup(title, true).then((res) => {
                      if (res?.poster) setActivePoster(res.poster);
                    });
                  }
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/75 text-white border border-white/10 backdrop-blur-sm">
                  18+
                </span>
                {tmdbData && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-zinc-900/90 text-zinc-300 border border-zinc-700/60 backdrop-blur-sm flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-zinc-400" />
                    <span>TMDB</span>
                  </span>
                )}
              </div>
            </div>

            {/* Metadata Info */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {(tmdbData?.vote_average || series.post_rate) && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Star className="w-3.5 h-3.5 fill-amber-300" />
                    {tmdbData?.vote_average ? `${tmdbData.vote_average.toFixed(1)} TMDB` : series.post_rate}
                  </span>
                )}
                {series.post_views && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-zinc-300 bg-white/5 border border-white/10">
                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                    {Number(series.post_views).toLocaleString()} Views
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-zinc-300 bg-white/5 border border-white/10 font-semibold">
                  {episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
                </span>
                {(tmdbData?.first_air_date || series.post_date) && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-zinc-400 bg-white/5 border border-white/10">
                    <Calendar className="w-3 h-3" />
                    {tmdbData?.first_air_date || series.post_date}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  {title}
                </h1>
                {altTitle && (
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1 italic font-medium">
                    {altTitle}
                  </p>
                )}
              </div>

              {/* Genre Pills */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {genres.map((g) => (
                    <a
                      key={g.term_id}
                      href={`#/genres?id=${g.term_id}`}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition"
                    >
                      {g.name}
                    </a>
                  ))}
                </div>
              )}

              {/* Action Buttons - Clean solid styles without neon glows */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {episodes.length > 0 && resumeEpisodeId && (
                  <a
                    href={`#/watch/${id}/${resumeEpisodeId}`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm transition active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
                    <span>{savedItem ? 'Resume Playing' : 'Watch Episode 1'}</span>
                  </a>
                )}

                <button
                  onClick={handleToggleBookmark}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition active:scale-95 cursor-pointer ${
                    bookmarked
                      ? 'bg-zinc-800 border-zinc-600 text-white'
                      : 'bg-zinc-900/90 border-white/10 text-zinc-200 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
                  <span>{bookmarked ? 'In My List' : 'Add to My List'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 mt-6">
        {/* Synopsis */}
        {synopsis && (
          <section className="bg-carbon-900 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Synopsis & Plot
              </h3>
              {tmdbData?.overview && (
                <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-zinc-500" />
                  TMDB Synopsis
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-4xl whitespace-pre-line">
              {synopsis}
            </p>
          </section>
        )}

        {/* Enhanced Episodes Section with TMDB Stills & Overview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-[#E50914]" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Episodes
              </h2>
              <span className="text-xs font-semibold text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {episodes.length} Available
              </span>
            </div>
            {tmdbEpisodes.length > 0 && (
              <span className="text-xs text-zinc-400 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                <Sparkles className="w-3 h-3 text-zinc-400" />
                <span>TMDB Episode Data Linked</span>
              </span>
            )}
          </div>

          {episodes.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 bg-carbon-900 rounded-2xl border border-white/10">
              <p className="text-sm font-semibold">No video streams currently available for this series.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {episodes.map((ep, idx) => {
                const epNum = idx + 1;
                const tmdbEp = tmdbEpisodes.find((te) => te.episode_number === epNum) || tmdbEpisodes[idx];
                const epStill = tmdbEp?.still || activeBackdrop || ep.chapter_thumbnail || thumbnail;
                const epName = tmdbEp?.name || ep.chapter_name || `Episode ${epNum}`;
                const epOverview = tmdbEp?.overview || '';
                const epRuntime = tmdbEp?.runtime ? `${tmdbEp.runtime}m` : null;
                const epAirDate = tmdbEp?.air_date || null;

                const epProgress = getProgress(id, ep.chapter_id);
                const progressPct = epProgress && epProgress.duration > 0
                  ? Math.min(100, (epProgress.currentTime / epProgress.duration) * 100)
                  : 0;
                const previewUrl = getEpisodePreviewUrl(ep);

                return (
                  <a
                    key={ep.chapter_id || idx}
                    href={`#/watch/${id}/${ep.chapter_id}`}
                    className="group bg-carbon-900 border border-white/[0.08] hover:border-white/20 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 block shadow-sm flex flex-col"
                  >
                    {/* 16:9 Thumbnail Box with Hover Video Preview */}
                    <EpisodeThumbnail
                      poster={epStill}
                      alt={epName}
                      previewUrl={previewUrl}
                      className="aspect-video w-full flex-none"
                    >
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-md">
                          <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
                        </div>
                      </div>

                      {/* Episode Number Pill */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white border border-white/10 backdrop-blur-sm">
                        EP {epNum}
                      </span>

                      {/* Duration / Air Date Pill */}
                      {epRuntime && (
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/80 text-zinc-300 border border-white/10 backdrop-blur-sm flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{epRuntime}</span>
                        </span>
                      )}

                      {/* Resume Progress Bar */}
                      {progressPct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <div
                            className="h-full bg-[#E50914]"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}
                    </EpisodeThumbnail>

                    {/* Episode Text Content */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-zinc-200 transition-colors">
                            {epName}
                          </h4>
                          {epAirDate && (
                            <span className="text-[10px] text-zinc-500 flex-shrink-0">
                              {epAirDate.slice(0, 4)}
                            </span>
                          )}
                        </div>

                        {epOverview ? (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                            {epOverview}
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-500 mt-1">
                            Full 1080p Master Stream
                          </p>
                        )}
                      </div>

                      {epProgress && epProgress.currentTime > 10 ? (
                        <p className="text-[10px] font-medium text-amber-400">
                          Resume at {Math.floor(epProgress.currentTime / 60)}:{(epProgress.currentTime % 60).toString().padStart(2, '0')}
                        </p>
                      ) : (
                        <span className="text-[10px] font-medium text-zinc-500">
                          Ready to watch
                        </span>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* Recommended Series */}
        {recommendations.length > 0 && (
          <section className="pt-4 space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Film className="w-4 h-4 text-[#E50914]" />
              <span>More Anime Like This</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {recommendations.map((item) => (
                <AnimeCard key={item.post_ID || item.id} item={item} isFeatured={true} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
