import React, { useEffect, useState } from 'react';
import { HentaiItem, Episode } from '../types/api';
import { API } from '../services/api';
import { AnimeCard } from '../components/AnimeCard';
import { useWatchlist, useWatchHistory } from '../hooks/useLocalStorage';
import { Play, Bookmark, Star, Eye, Calendar, Sparkles, ArrowLeft, RefreshCw, Film } from 'lucide-react';

interface SeriesPageProps {
  seriesId: string | number;
}

export const SeriesPage: React.FC<SeriesPageProps> = ({ seriesId }) => {
  const [series, setSeries] = useState<HentaiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<HentaiItem[]>([]);

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
          // Fetch recommendations using first genre tag or search query
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

  if (loading) {
    return (
      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-pulse">
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-20">
        <h2 className="text-xl font-bold text-white mb-2">Series Unavailable</h2>
        <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-6">{error || 'Series not found.'}</p>
        <a
          href="#/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cinema-red text-white font-semibold text-xs transition"
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
  const synopsis = series.post_content?.replace(/<[^>]*>/g, '') || '';
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
      thumbnail,
      episodesCount: episodes.length,
      rating: series.post_rate,
      views: series.post_views
    });
  };

  return (
    <div className="pb-16 pt-16 sm:pt-20">
      {/* Backdrop Header */}
      <div className="relative min-h-[360px] sm:min-h-[440px] w-full flex items-end overflow-hidden">
        {/* Background Image with Gradients */}
        <div className="absolute inset-0 -z-10">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover object-top filter brightness-[0.35] blur-sm scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/80 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            {/* Poster Card */}
            <div className="flex-none w-36 sm:w-48 lg:w-56 aspect-[2/3] rounded-2xl overflow-hidden bg-carbon-850 border border-white/10 shadow-2xl relative">
              <img
                src={thumbnail}
                alt={title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-carbon-950/80 text-white border border-white/10 backdrop-blur-sm">
                18+
              </span>
            </div>

            {/* Metadata Info */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {series.post_rate && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Star className="w-3.5 h-3.5 fill-amber-300" />
                    {series.post_rate}
                  </span>
                )}
                {series.post_views && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-gray-300 bg-white/5 border border-white/10">
                    <Eye className="w-3.5 h-3.5 text-gray-400" />
                    {Number(series.post_views).toLocaleString()} Views
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-gray-300 bg-white/5 border border-white/10 font-semibold">
                  {episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
                </span>
                {series.post_date && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-gray-400 bg-white/5 border border-white/10">
                    <Calendar className="w-3 h-3" />
                    {series.post_date}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  {title}
                </h1>
                {altTitle && (
                  <p className="text-xs sm:text-sm text-gray-400 mt-1 italic font-medium">
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
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition"
                    >
                      {g.name}
                    </a>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                {episodes.length > 0 && resumeEpisodeId && (
                  <a
                    href={`#/watch/${id}/${resumeEpisodeId}`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cinema-red hover:bg-cinema-crimson text-white font-semibold text-sm transition shadow-lg active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                    <span>{savedItem ? 'Resume Playing' : 'Watch Episode 1'}</span>
                  </a>
                )}

                <button
                  onClick={handleToggleBookmark}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition active:scale-95 backdrop-blur-md ${
                    bookmarked
                      ? 'bg-cinema-red border-cinema-red text-white'
                      : 'bg-white/5 border-white/15 text-gray-200 hover:bg-white/10 hover:text-white'
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Synopsis & Plot
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-4xl whitespace-pre-line">
              {synopsis}
            </p>
          </section>
        )}

        {/* Episodes Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-cinema-red" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Episodes
              </h2>
              <span className="text-xs font-semibold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {episodes.length} Available
              </span>
            </div>
          </div>

          {episodes.length === 0 ? (
            <div className="py-12 text-center text-gray-400 bg-carbon-900 rounded-2xl border border-white/10">
              <p className="text-sm font-semibold">No video streams currently available for this series.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {episodes.map((ep, idx) => {
                const epProgress = getProgress(id, ep.chapter_id);
                const progressPct = epProgress && epProgress.duration > 0
                  ? Math.min(100, (epProgress.currentTime / epProgress.duration) * 100)
                  : 0;

                return (
                  <a
                    key={ep.chapter_id || idx}
                    href={`#/watch/${id}/${ep.chapter_id}`}
                    className="group bg-carbon-900 border border-white/10 hover:border-white/25 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 block shadow-md"
                  >
                    {/* Thumbnail Box */}
                    <div className="relative aspect-video w-full bg-carbon-850 overflow-hidden">
                      <img
                        src={ep.chapter_thumbnail || thumbnail}
                        alt={ep.chapter_name || `Episode ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-cinema-red text-white flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Episode Tag */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-carbon-950/80 text-white border border-white/10 backdrop-blur-sm">
                        EP {idx + 1}
                      </span>

                      {/* Resume Progress Bar */}
                      {progressPct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <div
                            className="h-full bg-cinema-red"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Episode Text */}
                    <div className="p-3">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cinema-red transition-colors">
                        {ep.chapter_name || `Episode ${idx + 1}`}
                      </h4>
                      {epProgress && epProgress.currentTime > 10 ? (
                        <p className="text-[11px] text-gray-400 mt-1">
                          Resume at {Math.floor(epProgress.currentTime / 60)}:{(epProgress.currentTime % 60).toString().padStart(2, '0')}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400 mt-1">
                          Full 1080p Stream
                        </p>
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
              <Sparkles className="w-4 h-4 text-cinema-red" />
              <span>You Might Also Like</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
