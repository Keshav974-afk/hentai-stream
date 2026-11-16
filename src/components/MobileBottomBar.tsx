import React from 'react';
import { Home, Flame, Compass, Bookmark, Search } from 'lucide-react';

interface MobileBottomBarProps {
  onOpenSearch: () => void;
  activeRoute: string;
}

/**
 * FlowFlix Mobile floating pill tab bar matching the Voidflix / FlowFlix mobile app.
 * Features: Home | Trending | Genres | Search | My List
 * Floating translucent rounded pill with active indicator.
 * Hidden on desktop (lg+) and on fullscreen watch playback.
 */
export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({ onOpenSearch, activeRoute }) => {
  // If user is watching a video, hide the bottom bar to provide an immersive cinema experience
  if (activeRoute.startsWith('watch')) {
    return null;
  }

  const tabs = [
    { label: 'Home', href: '#/', icon: Home, id: 'home' },
    { label: 'Trending', href: '#/browse?sort=trending', icon: Flame, id: 'trending' },
    { label: 'Genres', href: '#/genres', icon: Compass, id: 'genres' },
    { label: 'Search', action: onOpenSearch, icon: Search, id: 'search' },
    { label: 'My List', href: '#/watchlist', icon: Bookmark, id: 'watchlist' },
  ];

  return (
    <div
      className="fixed inset-x-0 bottom-3 z-50 flex justify-center px-3 pointer-events-none lg:hidden select-none"
      style={{ touchAction: 'manipulation' }}
    >
      <nav className="pointer-events-auto flex h-14 w-full max-w-md items-center justify-between rounded-full border border-white/15 bg-[#121218]/90 px-2 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive =
            t.id !== 'search' &&
            (t.id === 'home'
              ? activeRoute === 'home' || activeRoute === ''
              : activeRoute.startsWith(t.id));

          if (t.action) {
            return (
              <button
                key={t.id}
                onClick={t.action}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1 text-center transition-all text-white/60 hover:text-white/90 cursor-pointer focus:outline-none"
              >
                <Icon className="size-5" />
                <span className="text-[10px] tracking-tight leading-none mt-0.5">{t.label}</span>
              </button>
            );
          }

          return (
            <a
              key={t.id}
              href={t.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1 text-center transition-all ${
                isActive
                  ? 'bg-white/10 text-white font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white/90'
              }`}
            >
              <Icon className="size-5" />
              <span className="text-[10px] tracking-tight leading-none mt-0.5">{t.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
};
