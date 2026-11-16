import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { AnimeCard } from './AnimeCard';

interface Top10ShelfProps {
  items: HentaiItem[];
}

export const Top10Shelf: React.FC<Top10ShelfProps> = ({ items }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const top10 = items.slice(0, 10);

  if (top10.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'text-zinc-200';
      case 1:
        return 'text-zinc-400';
      case 2:
        return 'text-zinc-500';
      default:
        return 'text-zinc-700';
    }
  };

  return (
    <section className="relative py-4 group select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="h-5 w-1 bg-amber-400 rounded-full flex-shrink-0" />
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Top 10 This Month</span>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Rankings
            </span>
          </h2>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left Scroll Button */}
        <button
          onClick={() => handleScroll('left')}
          className="absolute -left-2 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-carbon-900/90 text-white border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-carbon-800 hover:scale-105 shadow-xl focus:outline-none cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Right Scroll Button */}
        <button
          onClick={() => handleScroll('right')}
          className="absolute -right-2 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-carbon-900/90 text-white border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-carbon-800 hover:scale-105 shadow-xl focus:outline-none cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Shelf with stylized number */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none scroll-smooth pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {top10.map((item, idx) => {
            const rank = idx + 1;
            return (
              <div
                key={item.post_ID || item.id || idx}
                className="flex-none flex items-end w-[180px] sm:w-[220px] md:w-[250px]"
              >
                {/* Large stylized rank number */}
                <div className="relative w-14 sm:w-20 -mr-4 sm:-mr-6 z-10 select-none pb-4 pointer-events-none">
                  <span
                    className={`font-display text-6xl sm:text-8xl font-black leading-none tracking-tighter block ${getRankStyle(
                      idx
                    )}`}
                    style={{
                      WebkitTextStroke: '2px currentColor',
                      color: 'transparent'
                    }}
                  >
                    {rank}
                  </span>
                </div>

                {/* Card */}
                <div className="flex-1">
                  <AnimeCard item={item} isFeatured={true} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
