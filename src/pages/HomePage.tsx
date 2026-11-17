import React, { useEffect, useState } from 'react';
import { HomeData, HentaiItem } from '../types/api';
import { API } from '../services/api';
import { TMDB } from '../services/tmdb';
import { HeroBanner } from '../components/HeroBanner';
import { MediaShelf } from '../components/MediaShelf';
import { Top10Shelf } from '../components/Top10Shelf';
import { DetailModal } from '../components/DetailModal';
import { useWatchHistory } from '../hooks/useLocalStorage';
import { Play, Clock, ShieldAlert, RefreshCw } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<HentaiItem | null>(null);
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

  // Filter out any items with missing or invalid image data from featured sections
  const filterValidFeatured = (items: HentaiItem[] = []) => {
    return items.filter((item) => {
      if (!item) return false;
      const title = item.post_title || (item as any).title || '';
      if (!title.trim()) return false;
      const raw = item.post_thumbnail || item.thumbnail || (item as any).cover || '';
      if (TMDB.getPreSeeded(title)) return true;
      if (!raw || raw.trim() === '') return false;
      return true;
    });
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 pt-16 animate-pulse select-none max-w-[1800px] mx-auto">
        {/* Hero Skeleton */}
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 pt-24">
          <div className="w-full aspect-[16/10] sm:aspect-[21/9] lg:h-[75vh] bg-[#181818] rounded-2xl sm:rounded-3xl border border-white/5" />
        </div>
        {/* Shelf Skeletons */}
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 space-y-8">
          <div className="space-y-3">
            <div className="h-6 w-48 bg-zinc-800 rounded-lg" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-56 aspect-[2/3] md:aspect-video bg-[#181818] rounded-xl sm:rounded-2xl shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-20 select-none">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-[#E50914] mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Unable to Load Anime Stream Feed</h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-6">{error}</p>
        <button
          onClick={() => loadData(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b81d24] text-white font-semibold text-xs transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const trending = filterValidFeatured(data?.trending_month || []);
  const latestEpisodes = filterValidFeatured(data?.last_episodes || []);
  const recentSeries = filterValidFeatured(data?.last || []);
  const uncensored = filterValidFeatured(data?.uncensored || []);
  const ecchi = filterValidFeatured(data?.ecchi || []);
  const tentacle = filterValidFeatured(data?.tentacle || []);
  const incest = filterValidFeatured(data?.incest || []);
  const yuri = filterValidFeatured(data?.yuri || []);

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 select-none max-w-[1800px] mx-auto">
      {/* Hero Spotlight Carousel */}
      <HeroBanner items={trending} onMoreInfo={setSelectedDetail} />

      {/* Continue Watching Shelf (FlowFlix standard) */}
      {history.length > 0 && (
        <section className="relative py-2 px-4 sm:px-8 md:px-12 lg:px-16 select-none">
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Clock className="size-4 text-[#E50914]" />
              <span>Continue Watching</span>
              <span className="text-[10px] font-bold text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            </h2>
            <a
              href="#/watchlist"
              className="text-xs text-zinc-400 hover:text-white transition font-medium"
            >
              Manage History ›
            </a>
          </div>

          <div className="hide-scrollbar flex gap-2.5 sm:gap-4 overflow-x-auto pb-2 scroll-smooth">
            {history.slice(0, 10).map((h) => {
              const progressPct = h.duration > 0 ? Math.min(100, (h.currentTime / h.duration) * 100) : 0;
              return (
                <a
                  key={`${h.seriesId}-${h.chapterId}`}
                  href={`#/watch/${h.seriesId}/${h.chapterId}`}
                  className="shrink-0 w-44 sm:w-56 md:w-64 group bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 block shadow-md"
                >
                  <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                    {h.thumbnail ? (
                      <img
                        src={h.thumbnail}
                        alt={h.seriesTitle}
                        className="w-full h-full object-cover transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <Play className="size-8 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="size-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                        <Play className="size-4 fill-current ml-0.5" />
                      </div>
                    </div>
                    {/* Resume Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div
                        className="h-full bg-[#E50914]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-2.5 sm:p-3">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-zinc-200 transition-colors">
                      {h.seriesTitle}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {h.chapterTitle}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Top 10 Ranked Row */}
      <Top10Shelf items={trending} onMoreInfo={setSelectedDetail} />

      {/* Latest Episode Releases */}
      <MediaShelf
        title="Latest Releases"
        items={latestEpisodes}
        moreHref="#/browse?sort=latest"
        onMoreInfo={setSelectedDetail}
      />

      {/* Trending This Month */}
      <MediaShelf
        title="Trending This Month"
        items={trending}
        moreHref="#/browse?sort=trending"
        onMoreInfo={setSelectedDetail}
      />

      {/* Uncensored Vault */}
      <MediaShelf
        title="Uncensored Anime Vault"
        items={uncensored}
        moreHref="#/genres?id=uncensored"
        onMoreInfo={setSelectedDetail}
      />

      {/* Yuri / Romance */}
      {yuri.length > 0 && (
        <MediaShelf
          title="Yuri & Girls' Romance"
          items={yuri}
          moreHref="#/genres?id=yuri"
          onMoreInfo={setSelectedDetail}
        />
      )}

      {/* Forbidden & Taboo */}
      {incest.length > 0 && (
        <MediaShelf
          title="Forbidden Desires & Drama"
          items={incest}
          moreHref="#/genres?id=incest"
          onMoreInfo={setSelectedDetail}
        />
      )}

      {/* Supernatural & Tentacle */}
      {tentacle.length > 0 && (
        <MediaShelf
          title="Supernatural & Dark Fantasy"
          items={tentacle}
          moreHref="#/genres?id=monster"
          onMoreInfo={setSelectedDetail}
        />
      )}

      {/* Ecchi Comedy */}
      {ecchi.length > 0 && (
        <MediaShelf
          title="Ecchi & Harem Comedy"
          items={ecchi}
          moreHref="#/genres?id=ecchi"
          onMoreInfo={setSelectedDetail}
        />
      )}

      {/* Recently Added Series */}
      <MediaShelf
        title="Recently Added Series"
        items={recentSeries}
        moreHref="#/browse?sort=latest"
        onMoreInfo={setSelectedDetail}
      />

      {/* FlowFlix Signature Detail Preview Modal */}
      <DetailModal
        item={selectedDetail}
        onClose={() => setSelectedDetail(null)}
      />
    </div>
  );
};
