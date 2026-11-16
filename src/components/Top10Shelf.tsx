import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HentaiItem } from '../types/api';
import { TMDB } from '../services/tmdb';

interface Top10ShelfProps {
  items: HentaiItem[];
  onMoreInfo?: (item: HentaiItem) => void;
}

/**
 * FlowFlix signature Netflix-style ranked row:
 * Oversized outlined rank numbers sit behind each poster, top 10 only.
 */
export const Top10Shelf: React.FC<Top10ShelfProps> = ({ items, onMoreInfo }) => {
  const ref = useRef<HTMLDivElement>(null);
  const top10 = items.slice(0, 10);

  if (top10.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="group/row relative py-2 sm:py-3.5 select-none">
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-2 sm:mb-2.5 flex items-center justify-between">
        <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>Top 10 Series This Month</span>
          <span className="rounded-sm bg-[#E50914] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
            Top 10
          </span>
        </h2>
      </div>

      <div className="relative">
        {/* Left Scroll Button */}
        <button
          onClick={() => scroll(-1)}
          className="hidden md:grid absolute left-0 top-0 bottom-0 z-20 w-12 sm:w-14 place-items-center bg-black/60 hover:bg-black/85 text-white/80 hover:text-white opacity-0 group-hover/row:opacity-100 transition duration-200 cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="size-8" />
        </button>

        {/* Top 10 Scroller */}
        <div
          ref={ref}
          className="hide-scrollbar flex gap-2 sm:gap-3 overflow-x-auto px-4 sm:px-8 md:px-12 lg:px-16 py-3 scroll-smooth snap-x"
        >
          {top10.map((item, idx) => {
            const id = item.post_ID || item.id || '';
            const title = item.post_title || (item as any).title || 'Untitled';
            const pre = TMDB.getPreSeeded(title);
            const thumb = pre?.poster || item.post_thumbnail || item.thumbnail || '';

            return (
              <button
                key={id || idx}
                onClick={() => {
                  if (onMoreInfo) {
                    onMoreInfo(item);
                  } else {
                    window.location.hash = `#/series/${id}`;
                  }
                }}
                className="group/card snap-start relative shrink-0 flex items-end h-36 sm:h-48 pl-12 sm:pl-16 focus:outline-none cursor-pointer"
              >
                {/* FlowFlix Oversized Outlined Rank Number */}
                <span
                  className="absolute left-0 bottom-0 leading-none font-display select-none text-[8rem] sm:text-[10.5rem] rank-number pointer-events-none"
                  aria-hidden
                >
                  {idx + 1}
                </span>

                {/* Card Container */}
                <div className="relative w-24 sm:w-32 aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden bg-[#181818] border border-white/10 transition-transform duration-300 group-hover/card:scale-105 shadow-xl">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-xs px-2 text-center text-zinc-400">
                      {title}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-[10px] font-bold text-white line-clamp-1 leading-tight">
                      {title}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={() => scroll(1)}
          className="hidden md:grid absolute right-0 top-0 bottom-0 z-20 w-12 sm:w-14 place-items-center bg-black/60 hover:bg-black/85 text-white/80 hover:text-white opacity-0 group-hover/row:opacity-100 transition duration-200 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="size-8" />
        </button>
      </div>
    </section>
  );
};
