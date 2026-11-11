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

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[65vh] flex flex-col items-center justify-center text-center px-4 pt-24 space-y-4">
          <div className="w-16 h-16 rounded-full bg-carbon-800 border border-white/10 flex items-center justify-center text-[#E50914] text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-white">Playback or Display Interrupted</h2>
          <p className="text-xs text-gray-400 max-w-md">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-6 py-2.5 rounded-xl bg-[#E50914] text-white font-semibold text-xs transition hover:scale-105 active:scale-95"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      return <HomePage key="home" />;
    }

    if (segments[0] === 'series' && segments[1]) {
      return <SeriesPage key={`series-${segments[1]}`} seriesId={segments[1]} />;
    }

    if (segments[0] === 'watch' && segments[1]) {
      return <WatchPage key={`watch-${segments[1]}-${segments[2] || 'ep1'}`} seriesId={segments[1]} episodeId={segments[2]} />;
    }

    if (segments[0] === 'genres' || segments[0] === 'genre') {
      const initialId = segments[1] || searchParams.get('id') || undefined;
      return <GenresPage key={`genres-${initialId || 'all'}`} initialGenreId={initialId} />;
    }

    if (segments[0] === 'browse' || segments[0] === 'catalogue') {
      const sort = (searchParams.get('sort') as any) || 'trending';
      return <CataloguePage key={`cat-${sort}`} initialSort={sort} />;
    }

    if (segments[0] === 'watchlist' || segments[0] === 'history' || segments[0] === 'saved') {
      return <WatchlistPage key="watchlist" />;
    }

    // Default fallback to HomePage
    return <HomePage key="home-fallback" />;
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
        <ErrorBoundary>
          {renderRoute()}
        </ErrorBoundary>
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
