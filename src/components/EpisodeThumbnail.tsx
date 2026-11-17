import React, { useState, useRef, useEffect } from 'react';

export function getEpisodePreviewUrl(ep: any): string | null {
  if (!ep) return null;
  const raw = ep.preview || ep.preview_url;
  if (!raw || typeof raw !== 'string' || raw.trim() === '') return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.endsWith('.mp4') || trimmed.includes('/preview')
      ? trimmed
      : `${trimmed.replace(/\/$/, '')}/preview.mp4`;
  }
  const clean = trimmed.replace(/^\/+/, '').replace(/\/+$/, '');
  if (clean.endsWith('.mp4')) {
    return `https://coverlanyvd.org/storage/${clean}`;
  }
  return `https://coverlanyvd.org/storage/${clean}/preview.mp4`;
}

interface EpisodeThumbnailProps {
  poster: string;
  alt?: string;
  previewUrl?: string | null;
  className?: string;
  children?: React.ReactNode;
}

export const EpisodeThumbnail: React.FC<EpisodeThumbnailProps> = ({
  poster,
  alt = 'Episode thumbnail',
  previewUrl,
  className = '',
  children,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isHovered && previewUrl && !hasError) {
      // 150ms hover debounce to avoid accidental flashes when scrolling past
      timerRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      }, 150);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isHovered, previewUrl, hasError]);

  return (
    <div
      className={`relative overflow-hidden bg-zinc-900 select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Base Image */}
      <img
        src={poster}
        alt={alt}
        className={`w-full h-full object-cover transition-transform duration-300 ${
          isHovered ? 'scale-105' : 'scale-100'
        }`}
        loading="lazy"
      />

      {/* Video Preview Layer */}
      {previewUrl && !hasError && (
        <video
          ref={videoRef}
          src={previewUrl}
          muted
          loop
          playsInline
          preload="none"
          onError={() => setHasError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
            isPlaying ? 'opacity-100 z-10' : 'opacity-0 -z-10'
          }`}
        />
      )}

      {/* Active Preview Pill Tag */}
      {isPlaying && (
        <span className="absolute top-2 right-2 z-20 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/85 text-white border border-white/20 backdrop-blur-sm flex items-center gap-1 shadow-md">
          <span className="size-1.5 rounded-full bg-[#E50914] animate-pulse" />
          <span>Preview</span>
        </span>
      )}

      {/* Overlays / Badges */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {children}
      </div>
    </div>
  );
};
