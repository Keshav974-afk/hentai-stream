import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { MobileBottomBar } from './components/MobileBottomBar';
import { SearchModal } from './components/SearchModal';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { SeriesPage } from './pages/SeriesPage';
import { WatchPage } from './pages/WatchPage';
import { GenresPage } from './pages/GenresPage';
import { CataloguePage } from './pages/CataloguePage';
import { WatchlistPage } from './pages/WatchlistPage';

export const App: React.FC = () => {
  const [currentHash, setCurrentHash] = useState<string>(() => window.location.hash || '#/');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K or / to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Route Resolver
  const renderRoute = () => {
    const hash = currentHash.replace(/^#\/?/, '');
    const [pathPart, queryPart] = hash.split('?');
    const segments = pathPart.split('/').filter(Boolean);
    const searchParams = new URLSearchParams(queryPart || '');

    if (segments.length === 0 || segments[0] === '') {
      return <HomePage />;
    }

    if (segments[0] === 'series' && segments[1]) {
      return <SeriesPage seriesId={segments[1]} />;
    }

    if (segments[0] === 'watch' && segments[1] && segments[2]) {
      return <WatchPage seriesId={segments[1]} episodeId={segments[2]} />;
    }

    if (segments[0] === 'genres' || segments[0] === 'genre') {
      const initialId = segments[1] || searchParams.get('id') || undefined;
      return <GenresPage initialGenreId={initialId} />;
    }

    if (segments[0] === 'browse' || segments[0] === 'catalogue') {
      const sort = (searchParams.get('sort') as any) || 'trending';
      return <CataloguePage initialSort={sort} />;
    }

    if (segments[0] === 'watchlist' || segments[0] === 'history' || segments[0] === 'saved') {
      return <WatchlistPage />;
    }

    // Default fallback to HomePage
    return <HomePage />;
  };

  const getActiveRoute = () => {
    const hash = currentHash.replace(/^#\/?/, '');
    return hash.split('/')[0] || 'home';
  };

  return (
    <div className="min-h-screen bg-carbon-950 text-gray-100 flex flex-col font-sans selection:bg-cinema-red selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        activeRoute={getActiveRoute()}
      />

      {/* Main Page Body */}
      <main className="flex-1">
        {renderRoute()}
      </main>

      {/* Global Search Dialog */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomBar
        onOpenSearch={() => setIsSearchOpen(true)}
        activeRoute={getActiveRoute()}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
};
