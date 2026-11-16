import React from 'react';
import { Play, ShieldAlert, Heart, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  const handleOpenAgeGate = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-age-warning'));
  };

  return (
    <footer className="mt-20 border-t border-white/[0.08] bg-carbon-950/90 py-12 text-xs text-gray-400 select-none pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#E50914] flex items-center justify-center text-white">
                <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
              </div>
              <span className="font-display text-2xl tracking-wider text-white font-black">
                HENTAI<span className="text-cinema-red">STREAM</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cinema-red/20 text-cinema-red border border-cinema-red/30">
                18+ ADULT
              </span>
            </div>
            <p className="text-xs text-gray-400 max-w-md leading-relaxed">
              Premium high-definition animated streaming archive. Curated releases, instant multi-audio playback, and rich TMDB media metadata.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleOpenAgeGate}
                className="inline-flex items-center gap-1.5 text-xs text-cinema-red hover:text-white font-semibold underline underline-offset-4 cursor-pointer transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>18+ Age & Content Disclaimer</span>
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Explore</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#/" className="hover:text-white transition-colors">Home Spotlight</a>
              </li>
              <li>
                <a href="#/browse?sort=trending" className="hover:text-white transition-colors">Trending Series</a>
              </li>
              <li>
                <a href="#/browse?sort=latest" className="hover:text-white transition-colors">Latest Releases</a>
              </li>
              <li>
                <a href="#/genres" className="hover:text-white transition-colors">Genre Directory</a>
              </li>
              <li>
                <a href="#/catalogue" className="hover:text-white transition-colors">All Series (A-Z)</a>
              </li>
            </ul>
          </div>

          {/* Legal Disclaimers */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Legal & Compliance</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              All characters depicted in media on this website are fictional and canonically 18 years of age or older.
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Videos are hosted on third-party servers. We do not store or host video files directly.
            </p>
            <p className="text-[10px] text-gray-600 pt-1">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500">
          <div>
            &copy; {new Date().getFullYear()} HentaiStream. All rights reserved. Strictly 18+.
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleOpenAgeGate} className="hover:text-gray-300 transition-colors cursor-pointer">
              Age Gate
            </button>
            <span>•</span>
            <a href="#/watchlist" className="hover:text-gray-300 transition-colors">
              Saved Watchlist
            </a>
            <span>•</span>
            <span className="text-gray-600">Pure Stream Engine v2.5</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
