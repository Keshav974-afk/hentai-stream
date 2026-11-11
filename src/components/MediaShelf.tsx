import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { AnimeCard } from './AnimeCard';

interface MediaShelfProps {
  title: string;
  items: HentaiItem[];
  icon?: React.ReactNode;
  viewAllLink?: string;
  badge?: string;
}

export const MediaShelf: React.FC<MediaShelfProps> = ({
  title,
  items,
  icon,
  viewAllLink,
  badge,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <section className="relative py-4 group">
      {/* Shelf Header */}
      <div className="flex items-center justify-between mb-3 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-cinema-red">{icon}</span>}
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {title}
            {badge && (
              <span className="text-[11px] font-semibold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </h2>
        </div>

        {viewAllLink && (
          <a
            href={viewAllLink}
            className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white transition group/link"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover/link:translate-x-0.5 transition" />
          </a>
        )}
      </div>

      {/* Carousel Track Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left Scroll Button */}
        <button
          onClick={() => handleScroll('left')}
          className="absolute -left-2 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-carbon-900/90 text-white border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-carbon-850 hover:scale-105 shadow-xl focus:outline-none"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Right Scroll Button */}
        <button
          onClick={() => handleScroll('right')}
          className="absolute -right-2 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-carbon-900/90 text-white border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-carbon-850 hover:scale-105 shadow-xl focus:outline-none"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Horizontal Card Row */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none scroll-smooth pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {items.map((item, idx) => (
            <div
              key={item.post_ID || item.id || idx}
              className="flex-none w-[130px] sm:w-[160px] md:w-[185px] lg:w-[200px]"
            >
              <AnimeCard item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
