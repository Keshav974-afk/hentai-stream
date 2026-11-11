import React from 'react';
import { Home, Flame, Compass, Bookmark, Search } from 'lucide-react';

interface MobileBottomBarProps {
  onOpenSearch: () => void;
  activeRoute: string;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({ onOpenSearch, activeRoute }) => {
  // If user is watching a video, hide the bottom bar to provide an immersive cinema experience
  if (activeRoute.startsWith('watch')) {
    return null;
  }

  const items = [
    { label: 'Home', href: '#/', icon: Home, id: 'home' },
    { label: 'Trending', href: '#/browse?sort=trending', icon: Flame, id: 'trending' },
    { label: 'Search', action: onOpenSearch, icon: Search, id: 'search' },
    { label: 'Genres', href: '#/genres', icon: Compass, id: 'genres' },
    { label: 'My List', href: '#/watchlist', icon: Bookmark, id: 'watchlist' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-carbon-950/90 backdrop-blur-lg border-t border-white/10 px-2 py-1.5 flex items-center justify-around safe-bottom shadow-2xl">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id !== 'search' && (
          item.id === 'home' ? (activeRoute === 'home' || activeRoute === '') : activeRoute.startsWith(item.id)
        );

        if (item.action) {
          return (
            <button
              key={item.id}
              onClick={item.action}
              className="flex flex-col items-center justify-center py-1 px-3 text-gray-400 hover:text-white transition focus:outline-none"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </button>
          );
        }

        return (
          <a
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 transition rounded-lg ${
              active
                ? 'text-cinema-red font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">{item.label}</span>
          </a>
        );
      })}
    </div>
  );
};
