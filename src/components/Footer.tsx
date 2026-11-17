import React from 'react';
import { Film, ShieldAlert, ExternalLink, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const handleOpenWarning = () => {
    window.dispatchEvent(new CustomEvent('open-age-warning'));
  };

  const columns = [
    {
      heading: 'Browse',
      links: [
        { label: 'Home', href: '#/' },
        { label: 'Trending', href: '#/browse?sort=trending' },
        { label: 'Latest Episodes', href: '#/browse?sort=latest' },
        { label: 'Genres & Themes', href: '#/genres' },
        { label: 'My Watchlist', href: '#/watchlist' },
      ],
    },
    {
      heading: 'Categories',
      links: [
        { label: 'Uncensored', href: '#/genres?id=uncensored' },
        { label: 'Harem & Romance', href: '#/genres?id=harem' },
        { label: 'Ecchi & Comedy', href: '#/genres?id=ecchi' },
        { label: 'Fantasy & Supernatural', href: '#/genres?id=fantasy' },
        { label: 'A-Z Catalog', href: '#/catalogue' },
      ],
    },
    {
      heading: 'VoidFlix Network',
      links: [
        { label: 'voidflix.org (Movies & TV)', href: 'https://voidflix.org', external: true },
        { label: 'manga.voidflix.org (Manga Reader)', href: 'https://manga.voidflix.org', external: true },
        { label: '1080p Quality Info', href: '#/' },
        { label: 'Offline Download FAQ', href: '#/' },
      ],
    },
    {
      heading: 'Legal & Policy',
      links: [
        { label: '18+ Adult Policy', action: handleOpenWarning },
        { label: 'Content Disclaimer', action: handleOpenWarning },
        { label: 'Terms of Service', href: '#/' },
        { label: 'DMCA & Removal', href: '#/' },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/10 mt-12 px-4 sm:px-8 md:px-12 lg:px-16 py-12 text-sm text-zinc-400 select-none pb-24 lg:pb-12 bg-black/40">
      <div className="max-w-[1800px] mx-auto">
        {/* Brand Row & Network Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E50914] flex items-center justify-center text-white">
              <Film className="size-4" />
            </div>
            <span className="font-display font-black text-2xl tracking-wider text-[#E50914]">
              VOIDFLIX
            </span>
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 border border-white/10 text-zinc-300">
              18+ ONLY
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <span className="text-zinc-500 flex items-center gap-1.5 mr-1">
              <Globe className="size-3.5 text-zinc-400" />
              <span>Network:</span>
            </span>
            <a
              href="https://voidflix.org"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:border-white/25 transition flex items-center gap-1.5"
            >
              <span>voidflix.org</span>
              <ExternalLink className="size-3 text-zinc-400" />
            </a>
            <a
              href="https://manga.voidflix.org"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:border-white/25 transition flex items-center gap-1.5"
            >
              <span>manga.voidflix.org</span>
              <ExternalLink className="size-3 text-zinc-400" />
            </a>
          </div>
        </div>

        {/* 4 Columns Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="text-white font-semibold mb-3.5 text-xs uppercase tracking-wider">
                {col.heading}
              </h3>
              <ul className="space-y-2 text-xs">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.action ? (
                      <button
                        onClick={link.action}
                        className="hover:text-white transition cursor-pointer text-left"
                      >
                        {link.label}
                      </button>
                    ) : (link as any).external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition inline-flex items-center gap-1"
                      >
                        <span>{link.label}</span>
                        <ExternalLink className="size-2.5 opacity-60" />
                      </a>
                    ) : (
                      <a href={link.href} className="hover:text-white transition">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal Disclaimers & TMDB Attribution */}
        <div className="pt-6 border-t border-white/5 space-y-3 text-xs text-zinc-500 leading-relaxed max-w-4xl">
          <p>
            Voidflix is a private demonstration streaming catalog. All media items are intended
            strictly for mature audiences aged 18 and older. We do not host copyrighted files on our
            servers; all streams and indexing are referenced from external third-party sources.
          </p>
          <p>
            Metadata, artwork backdrops, and episode details are enriched via{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-white underline"
            >
              The Movie Database (TMDB)
            </a>{' '}
            API. This application is not endorsed or certified by TMDB.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-[11px] text-zinc-500">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p>© {currentYear} Voidflix. All rights reserved.</p>
              <span className="hidden sm:inline text-zinc-700">•</span>
              <a
                href="https://voidflix.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white underline transition"
              >
                voidflix.org
              </a>
              <span className="text-zinc-700">•</span>
              <a
                href="https://manga.voidflix.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white underline transition"
              >
                manga.voidflix.org
              </a>
            </div>
            <button
              onClick={handleOpenWarning}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <ShieldAlert className="size-3.5 text-[#E50914]" />
              <span>Review 18+ Content Warning</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
