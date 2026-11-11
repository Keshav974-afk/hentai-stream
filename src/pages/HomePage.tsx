import React, { useEffect, useState } from 'react';
import { HomeData, HentaiItem } from '../types/api';
import { API } from '../services/api';
import { HeroBanner } from '../components/HeroBanner';
import { MediaShelf } from '../components/MediaShelf';
import { Top10Shelf } from '../components/Top10Shelf';
import { useWatchHistory } from '../hooks/useLocalStorage';
import { Play, Clock, Sparkles, Flame, ShieldAlert, Heart, RefreshCw } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { history } = useWatchHistory();

  const loadData = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const home = await API.getHome(force);
      setData(home);
    } catch (err: any) {
      setError(err?.message || 'Failed to load home feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6 pt-16 animate-pulse">
        {/* Hero Skeleton */}
        <div className="w-full aspect-[21/9] min-h-[420px] bg-carbon-850/60 border border-white/5" />
        {/* Shelf Skeletons */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-3">
            <div className="h-6 w-48 bg-carbon-800 rounded-lg" />
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-carbon-800/80 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-20">
        <div className="w-16 h-16 rounded-2xl bg-carbon-900 border border-white/10 flex items-center justify-center text-cinema-red mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Unable to Load Anime Feed</h2>
        <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-6">{error}</p>
        <button
          onClick={() => loadData(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cinema-red hover:bg-cinema-crimson text-white font-semibold text-xs transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const trending = data?.trending_month || [];
  const latestEpisodes = data?.last_episodes || [];
  const recentSeries = data?.last || [];
  const uncensored = data?.uncensored || [];
  const ecchi = data?.ecchi || [];
  const tentacle = data?.tentacle || [];
  const incest = data?.incest || [];
  const yuri = data?.yuri || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Spotlight Carousel */}
      <HeroBanner items={trending} />

      {/* Continue Watching Shelf (Only if user has watched videos) */}
      {history.length > 0 && (
        <section className="relative py-2 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cinema-red" />
              <span>Continue Watching</span>
              <span className="text-[11px] font-semibold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            </h2>
            <a
              href="#/watchlist"
              className="text-xs text-gray-400 hover:text-white transition font-medium"
            >
              Manage History
            </a>
          </div>

          <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none pb-2">
            {history.slice(0, 10).map((h) => {
              const progressPct = h.duration > 0 ? Math.min(100, (h.currentTime / h.duration) * 100) : 0;
              return (
                <a
                  key={`${h.seriesId}-${h.chapterId}`}
                  href={`#/watch/${h.seriesId}/${h.chapterId}`}
                  className="flex-none w-56 sm:w-64 group bg-carbon-850 border border-white/5 hover:border-white/20 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 block shadow-md"
                >
                  <div className="relative aspect-video w-full bg-carbon-900 overflow-hidden">
                    {h.thumbnail ? (
                      <img
                        src={h.thumbnail}
                        alt={h.seriesTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-carbon-850">
                        <Play className="w-8 h-8 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-cinema-red text-white flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>
                    {/* Resume Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div
                        className="h-full bg-cinema-red"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-cinema-red transition-colors">
                      {h.seriesTitle}
                    </h4>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {h.chapterTitle}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Top 10 Ranked */}
      <Top10Shelf items={trending} />

      {/* Latest Episode Releases */}
      <MediaShelf
        title="Latest Releases"
        items={latestEpisodes}
        icon={<Sparkles className="w-4 h-4" />}
        badge="New Episodes"
        viewAllLink="#/browse?sort=latest"
      />

      {/* Trending Now */}
      <MediaShelf
        title="Trending This Month"
        items={trending}
        icon={<Flame className="w-4 h-4" />}
        viewAllLink="#/browse?sort=trending"
      />

      {/* Uncensored Vault */}
      <MediaShelf
        title="Uncensored Vault"
        items={uncensored}
        badge="Uncensored"
        viewAllLink="#/genres"
      />

      {/* Yuri / Girls' Romance */}
      {yuri.length > 0 && (
        <MediaShelf
          title="Yuri & Romance"
          items={yuri}
          icon={<Heart className="w-4 h-4" />}
        />
      )}

      {/* Taboo & Incest */}
      {incest.length > 0 && (
        <MediaShelf
          title="Forbidden Desires"
          items={incest}
        />
      )}

      {/* Supernatural & Tentacle */}
      {tentacle.length > 0 && (
        <MediaShelf
          title="Tentacle & Supernatural"
          items={tentacle}
        />
      )}

      {/* Ecchi Comedy */}
      {ecchi.length > 0 && (
        <MediaShelf
          title="Ecchi Fan-Service"
          items={ecchi}
        />
      )}

      {/* Recently Added Series */}
      <MediaShelf
        title="Recently Added Series"
        items={recentSeries}
        badge="New Series"
        viewAllLink="#/browse?sort=latest"
      />
    </div>
  );
};
