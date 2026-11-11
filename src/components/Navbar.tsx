import React, { useEffect, useState } from 'react';
import { Search, Film, Flame, Sparkles, Compass, Bookmark, Menu, X, Play } from 'lucide-react';

interface NavbarProps {
  onOpenSearch: () => void;
  activeRoute: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch, activeRoute }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { label: 'My List', href: '#/watchlist', icon: Bookmark, id: 'watchlist' },
  ];

  const isLinkActive = (id: string, href: string) => {
    if (id === 'home' && (activeRoute === 'home' || activeRoute === '')) return true;
    if (activeRoute.startsWith(id)) return true;
    return window.location.hash === href;
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-carbon-950/90 backdrop-blur-md border-b border-white/10 py-3 shadow-lg'
          : 'bg-gradient-to-b from-carbon-950/90 via-carbon-950/50 to-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <a
            href="#/"
            className="flex items-center gap-2 group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-cinema-red flex items-center justify-center text-white transition-transform group-hover:scale-105">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl tracking-wider text-white font-black leading-none">
                VOIDFLIX<span className="text-cinema-red">.</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-gray-400 font-semibold leading-none mt-0.5">
                Anime Cinema
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    active
                      ? 'text-white bg-white/10 border border-white/15 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs transition group focus:outline-none focus:ring-1 focus:ring-white/20"
            aria-label="Search anime"
          >
            <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition" />
            <span className="hidden sm:inline text-xs text-gray-400 group-hover:text-gray-300">Search anime...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-400 bg-black/40 border border-white/10 rounded">
              ⌘K
            </kbd>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-carbon-950/95 backdrop-blur-xl border-b border-white/10 px-4 pt-3 pb-5 space-y-1.5 animate-fadeIn">
          {navLinks.map((link) => {
            const active = isLinkActive(link.id, link.href);
            const Icon = link.icon;
            return (
              <a
                key={link.id}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? 'text-white bg-white/10 border border-white/15 font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 text-gray-400" />
                {link.label}
              </a>
            );
          })}
        </div>
      )}
    </header>
  );
};
