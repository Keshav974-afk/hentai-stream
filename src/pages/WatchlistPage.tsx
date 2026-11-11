import React, { useState } from 'react';
import { useWatchlist, useWatchHistory } from '../hooks/useLocalStorage';
import { Bookmark, Clock, Trash2, Play, ArrowRight, Star, Eye } from 'lucide-react';

export const WatchlistPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
  const { watchlist, removeFromWatchlist, clearWatchlist } = useWatchlist();
  const { history, removeHistoryItem, clearHistory } = useWatchHistory();

  return (
    <div className="pt-20 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header and Tab Switches */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Library & History
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Pick up right where you left off or manage your bookmarked favorites.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-carbon-900 border border-white/10 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'history'
                ? 'bg-cinema-red text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Continue Watching ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'saved'
                ? 'bg-cinema-red text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>My Bookmarks ({watchlist.length})</span>
          </button>
        </div>
      </div>

      {/* Continue Watching Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Recent Viewing Progress
            </h2>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-cinema-red transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All History</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-20 text-center text-gray-400 bg-carbon-900 rounded-2xl border border-white/10 space-y-3">
              <Clock className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm font-semibold text-white">No viewing history recorded yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Episodes you watch will automatically remember your timestamp and appear here for instant resuming.
              </p>
              <a
                href="#/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cinema-red text-white text-xs font-semibold hover:bg-cinema-crimson transition mt-2"
              >
                <span>Browse Trending Anime</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {history.map((item) => {
                const progressPct = item.duration > 0
                  ? Math.min(100, (item.currentTime / item.duration) * 100)
                  : 0;

                return (
                  <div
                    key={`${item.seriesId}-${item.chapterId}`}
                    className="group bg-carbon-900 border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-md flex flex-col"
                  >
                    <div className="relative aspect-video w-full bg-carbon-850 overflow-hidden">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.seriesTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-carbon-850">
                          <Play className="w-8 h-8 text-white/50" />
                        </div>
                      )}

                      {/* Play action overlay */}
                      <a
                        href={`#/watch/${item.seriesId}/${item.chapterId}`}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <div className="w-11 h-11 rounded-full bg-cinema-red text-white flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </a>

                      {/* Progress bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div
                          className="h-full bg-cinema-red"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <a
                          href={`#/series/${item.seriesId}`}
                          className="text-xs sm:text-sm font-bold text-white hover:text-cinema-red transition-colors line-clamp-1"
                        >
                          {item.seriesTitle}
                        </a>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {item.chapterTitle}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-gray-400">
                        <span>
                          {Math.floor(item.currentTime / 60)}:{(item.currentTime % 60).toString().padStart(2, '0')} / {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                        </span>
                        <button
                          onClick={() => removeHistoryItem(item.seriesId, item.chapterId)}
                          className="p-1 text-gray-500 hover:text-cinema-red transition"
                          title="Remove from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bookmarks Tab */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Saved Anime Series
            </h2>
            {watchlist.length > 0 && (
              <button
                onClick={clearWatchlist}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-cinema-red transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Bookmarks</span>
              </button>
            )}
          </div>

          {watchlist.length === 0 ? (
            <div className="py-20 text-center text-gray-400 bg-carbon-900 rounded-2xl border border-white/10 space-y-3">
              <Bookmark className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm font-semibold text-white">Your list is currently empty</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Bookmark series while browsing to quickly find and stream them anytime.
              </p>
              <a
                href="#/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cinema-red text-white text-xs font-semibold hover:bg-cinema-crimson transition mt-2"
              >
                <span>Discover Titles</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {watchlist.map((item) => (
                <div key={item.seriesId} className="group relative flex flex-col">
                  <a
                    href={`#/series/${item.seriesId}`}
                    className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-carbon-850 border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-1 block shadow-md"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-carbon-950/90 via-transparent to-black/20" />

                    {/* Delete action */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFromWatchlist(item.seriesId);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-carbon-950/80 text-gray-300 hover:text-cinema-red border border-white/10 backdrop-blur-md transition z-10"
                      title="Remove bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-gray-300 z-10">
                      {item.rating && (
                        <div className="flex items-center gap-1 text-amber-400 font-semibold bg-carbon-950/70 px-1.5 py-0.5 rounded border border-white/10">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{item.rating}</span>
                        </div>
                      )}
                    </div>
                  </a>

                  <a
                    href={`#/series/${item.seriesId}`}
                    className="mt-2 text-xs sm:text-sm font-semibold text-gray-200 group-hover:text-white transition-colors line-clamp-2"
                  >
                    {item.title}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
