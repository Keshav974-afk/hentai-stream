import React, { useEffect, useState } from 'react';
import { Search, Bookmark, Flame, Film, Sparkles, Compass } from 'lucide-react';
import { useWatchlist } from '../hooks/useLocalStorage';

interface NavbarProps {
  onOpenSearch: () => void;
  activeRoute: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch, activeRoute }) => {
  const [scrolled, setScrolled] = useState(false);
  const { watchlist } = useWatchlist();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#/', id: 'home', icon: Film },
    { label: 'Trending', href: '#/browse?sort=trending', id: 'trending', icon: Flame },
    { label: 'Latest', href: '#/browse?sort=latest', id: 'latest', icon: Sparkles },
    { label: 'Genres', href: '#/genres', id: 'genres', icon: Compass },
    { label: 'A-Z Archive', href: '#/catalogue', id: 'catalogue', icon: Film },
    { label: 'My List', href: '#/watchlist', id: 'watchlist', icon: Bookmark },
  ];

  const isLinkActive = (id: string, href: string) => {
    if (id === 'home' && (activeRoute === 'home' || activeRoute === '')) return true;
    if (activeRoute.startsWith(id)) return true;
    return window.location.hash === href;
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 select-none ${
        scrolled || activeRoute !== 'home'
          ? 'glass-strong border-x-0 border-t-0 py-2 sm:py-2.5'
          : 'bg-gradient-to-b from-black/90 via-black/40 to-transparent py-3 sm:py-4'
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-6 px-4 sm:px-8 max-w-[1800px] mx-auto">
        {/* Brand Logo */}
        <a
          href="#/"
          className="font-display font-black text-2xl sm:text-3xl tracking-wider text-[#E50914] shrink-0 hover:opacity-90 transition"
        >
          VOIDFLIX
        </a>

        {/* Desktop Navigation Links with FlowFlix rounded active pill */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm ml-2">
          {navLinks.map((n) => {
            const active = isLinkActive(n.id, n.href);
            return (
              <a
                key={n.href}
                href={n.href}
                className={`px-3 py-1.5 rounded-full transition font-medium text-[13px] xl:text-[14px] ${
                  active
                    ? 'px-3.5 py-1.5 rounded-full bg-black/75 text-white font-bold border border-white/10 shadow-md backdrop-blur-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {n.label}
              </a>
            );
          })}
        </nav>

        {/* Right Section: Desktop Search Capsule + Icons */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Desktop Search Capsule (FlowFlix signature rounded pill) */}
          <div
            onClick={onOpenSearch}
            className="hidden md:flex items-center rounded-full border border-white/20 bg-black/50 px-3.5 py-1.5 text-sm text-white hover:border-white hover:bg-black/80 transition-all duration-300 w-44 lg:w-64 shadow-inner cursor-pointer"
          >
            <Search className="size-4 text-white/60 mr-2 shrink-0" />
            <span className="text-xs text-white/50 truncate">Search anime, genres...</span>
            <span className="ml-auto text-[10px] text-zinc-500 font-mono bg-white/10 px-1.5 py-0.5 rounded">
              Ctrl K
            </span>
          </div>

          {/* Mobile Search Button */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
            aria-label="Search"
          >
            <Search className="size-5" />
          </button>

          {/* 18+ Mature Badge */}
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-black bg-zinc-900 border border-white/10 text-zinc-300">
            18+
          </span>

          {/* My List Bookmark Link */}
          <a
            href="#/watchlist"
            className="relative p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
            aria-label="My Watchlist"
            title="My Watchlist"
          >
            <Bookmark className="size-5" />
            {watchlist.length > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#E50914]" />
            )}
          </a>
        </div>
      </div>
    </header>
  );
};
