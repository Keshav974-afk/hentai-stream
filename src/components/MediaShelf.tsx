import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { AnimeCard } from './AnimeCard';

interface MediaShelfProps {
  title: string;
  items: HentaiItem[];
  moreHref?: string;
  moreLabel?: string;
  onMoreInfo?: (item: HentaiItem) => void;
}

export const MediaShelf: React.FC<MediaShelfProps> = ({
  title,
  items,
  moreHref,
  moreLabel = 'Explore All',
  onMoreInfo,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="group/row relative py-2 sm:py-3.5 select-none">
      {/* Shelf Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 md:px-12 lg:px-16 mb-2 sm:mb-2.5">
        <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>{title}</span>
          <span className="text-xs font-semibold text-zinc-500 hidden sm:inline">
            ({items.length})
          </span>
        </h2>

        {moreHref && (
          <a
            href={moreHref}
            className="text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center gap-1 group/link"
          >
            <span>{moreLabel}</span>
            <span className="group-hover/link:translate-x-0.5 transition-transform">›</span>
          </a>
        )}
      </div>

      <div className="relative">
        {/* Left Scroll Button */}
        <button
          onClick={() => scroll(-1)}
          className="hidden md:grid absolute left-0 top-0 bottom-0 z-30 w-12 sm:w-14 place-items-center bg-black/60 hover:bg-black/85 text-white/80 hover:text-white opacity-0 group-hover/row:opacity-100 transition duration-200 cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="size-8" />
        </button>

        {/* Horizontal Row Cards */}
        <div
          ref={scrollRef}
          className="hide-scrollbar flex gap-2.5 sm:gap-4 lg:gap-4.5 overflow-x-auto px-4 sm:px-8 md:px-12 lg:px-16 py-2.5 sm:py-3.5 scroll-smooth snap-x"
        >
          {items.map((item, idx) => (
            <div
              key={item.post_ID || item.id || idx}
              className="snap-start shrink-0 w-28 sm:w-36 md:w-56 lg:w-72 xl:w-[calc((min(100vw,1920px)-9rem)/6)] max-w-[320px]"
            >
              <AnimeCard item={item} isFeatured={true} onMoreInfo={onMoreInfo} />
            </div>
          ))}
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={() => scroll(1)}
          className="hidden md:grid absolute right-0 top-0 bottom-0 z-30 w-12 sm:w-14 place-items-center bg-black/60 hover:bg-black/85 text-white/80 hover:text-white opacity-0 group-hover/row:opacity-100 transition duration-200 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="size-8" />
        </button>
      </div>
    </section>
  );
};
