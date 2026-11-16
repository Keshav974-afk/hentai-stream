import React, { useEffect, useState } from 'react';
import { Search, Film, Flame, Sparkles, Compass, Bookmark, Menu, X, Play, ShieldAlert } from 'lucide-react';
import { useWatchlist } from '../hooks/useLocalStorage';

interface NavbarProps {
  onOpenSearch: () => void;
  activeRoute: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch, activeRoute }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { watchlist } = useWatchlist();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeRoute]);

  const navLinks = [
    { label: 'Home', href: '#/', icon: Film, id: 'home' },
    { label: 'Trending', href: '#/browse?sort=trending', icon: Flame, id: 'trending' },
    { label: 'Latest', href: '#/browse?sort=latest', icon: Sparkles, id: 'latest' },
    { label: 'Genres', href: '#/genres', icon: Compass, id: 'genres' },
    { label: 'A-Z', href: '#/catalogue', icon: Film, id: 'catalogue' },
    { label: 'My List', href: '#/watchlist', icon: Bookmark, id: 'watchlist', badge: watchlist.length > 0 ? watchlist.length : undefined },
  ];

  const isLinkActive = (id: string, href: string) => {
    if (id === 'home' && (activeRoute === 'home' || activeRoute === '')) return true;
    if (activeRoute.startsWith(id)) return true;
    return window.location.hash === href;
  };

  const handleOpenWarning = () => {
    window.dispatchEvent(new CustomEvent('open-age-warning'));
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 select-none ${
        isScrolled
          ? 'bg-carbon-950/90 backdrop-blur-xl border-b border-white/[0.08] py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)]'
          : 'bg-gradient-to-b from-carbon-950 via-carbon-950/60 to-transparent py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo & Desktop Nav */}
        <div className="flex items-center gap-7">
          <a
            href="#/"
            className="flex items-center gap-2.5 group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#E50914] flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-105">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl tracking-wider text-white font-black leading-none">
                HENTAI<span className="text-cinema-red">STREAM</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-gray-400 font-semibold leading-none mt-0.5">
                Anime Archive • 18+
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isLinkActive(link.id, link.href);
              const Icon = link.icon;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'text-white bg-white/10 border border-white/15 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                  {link.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-cinema-red text-white">
                      {link.badge}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-carbon-850 hover:bg-carbon-800 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-xs transition-all shadow-sm group focus:outline-none focus:ring-1 focus:ring-cinema-red/40 cursor-pointer"
            aria-label="Search anime series"
          >
            <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-cinema-red transition-colors" />
            <span className="hidden sm:inline text-xs text-gray-400 group-hover:text-gray-200 font-medium">Search anime...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-400 bg-black/50 border border-white/10 rounded">
              ⌘K
            </kbd>
          </button>

          {/* 18+ Warning Quick Check Button */}
          <button
            onClick={handleOpenWarning}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-cinema-red/10 border border-cinema-red/20 hover:border-cinema-red/40 text-cinema-red hover:text-white text-[11px] font-bold transition-all cursor-pointer"
            title="18+ Age & Content Policy"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>18+</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-carbon-850 border border-white/10 text-gray-300 hover:text-white focus:outline-none cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-carbon-950/95 backdrop-blur-2xl border-b border-white/10 px-4 pt-3 pb-5 space-y-1.5 animate-fade-in shadow-2xl">
          {navLinks.map((link) => {
            const active = isLinkActive(link.id, link.href);
            const Icon = link.icon;
            return (
              <a
                key={link.id}
                href={link.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                  active
                    ? 'text-white bg-white/10 border border-white/15'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-cinema-red" />
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cinema-red text-white">
                    {link.badge}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </header>
  );
};
