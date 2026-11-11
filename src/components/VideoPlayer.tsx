import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Episode, VideoQualityLevel } from '../types/api';
import { useWatchHistory } from '../hooks/useLocalStorage';

interface VideoPlayerProps {
  streamUrl: string;
  seriesId: string | number;
  seriesTitle: string;
  episode: Episode;
  episodeIndex: number;
  totalEpisodes: number;
  episodes: Episode[];
  onSelectEpisode: (index: number) => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
  poster?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamUrl,
  seriesId,
  seriesTitle,
  episode,
  episodeIndex,
  totalEpisodes,
  episodes,
  onSelectEpisode,
  onNextEpisode,
  onPrevEpisode,
  isTheaterMode = false,
  onToggleTheater,
  poster = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  const { saveProgress, getProgress } = useWatchHistory();

  // Playback & State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    return parseFloat(localStorage.getItem('voidflix_volume') || '1');
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('voidflix_muted') === 'true';
  });
  const [brightness, setBrightness] = useState<number>(() => {
    return parseFloat(localStorage.getItem('voidflix_brightness') || '1');
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [qualityLevels, setQualityLevels] = useState<VideoQualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [currentQualityLabel, setCurrentQualityLabel] = useState<string>('Auto');
  const [speed, setSpeed] = useState<number>(1);
  const [activeSheet, setActiveSheet] = useState<'none' | 'settings' | 'subtitles' | 'drawer' | 'download'>('none');
  const [seekFlash, setSeekFlash] = useState<'left' | 'right' | null>(null);
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => {
    return localStorage.getItem('voidflix_autoplay') !== 'false';
  });
  const [selectedSub, setSelectedSub] = useState<string>('en');

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatRemaining = (cur: number, dur: number) => {
    if (isNaN(dur) || dur <= 0) return '-00:00';
    const rem = Math.max(0, dur - cur);
    return `-${formatTime(rem)}`;
  };

  const scheduleHideControls = useCallback((delay = 3500) => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && activeSheet === 'none') {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, delay);
    }
  }, [isPlaying, activeSheet]);

  const revealControls = () => {
    setShowControls(true);
    scheduleHideControls();
  };

  // Initialize HLS & Video Stream (FlowFlix Engine Spec)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsBuffering(true);

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // Critical: OctopusManifest VOD streams require lowLatencyMode=false
        capLevelToPlayerSize: true,
        renderTextTracksNatively: false,
        backBufferLength: 90
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels: VideoQualityLevel[] = data.levels.map((lvl, index) => ({
          index,
          height: lvl.height,
          bitrate: lvl.bitrate,
          label: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`
        }));
        setQualityLevels(levels);

        // Auto-resume previously saved timestamp if exists
        const saved = getProgress(seriesId, episode.chapter_id);
        if (saved && saved.currentTime > 10 && saved.currentTime < (saved.duration - 15)) {
          video.currentTime = saved.currentTime;
          setCurrentTime(saved.currentTime);
        }

        // Try to start playback
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          }).catch(() => {
            setIsPlaying(false);
            setIsBuffering(false);
          });
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(data.level);
        if (data.level === -1) {
          setCurrentQualityLabel('Auto');
        } else if (hls.levels[data.level]) {
          setCurrentQualityLabel(`${hls.levels[data.level].height}p`);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          hls.destroy();
          setIsBuffering(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, episode.chapter_id, seriesId]);

  // Sync Volume & Brightness
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      videoRef.current.style.filter = `brightness(${brightness})`;
    }
  }, [volume, isMuted, brightness]);

  // Fullscreen change
  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // Keyboard Navigation (FlowFlix Spec)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'j':
        case 'arrowleft':
          e.preventDefault();
          seekDelta(-10);
          break;
        case 'l':
        case 'arrowright':
          e.preventDefault();
          seekDelta(10);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          e.preventDefault();
          if (onToggleTheater) onToggleTheater();
          break;
        case 'e':
          e.preventDefault();
          setActiveSheet(activeSheet === 'drawer' ? 'none' : 'drawer');
          break;
        case 'p':
          e.preventDefault();
          if (onPrevEpisode && episodeIndex > 0) onPrevEpisode();
          break;
        case 'n':
          e.preventDefault();
          if (onNextEpisode && episodeIndex + 1 < totalEpisodes) onNextEpisode();
          break;
        case 'escape':
          setActiveSheet('none');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, activeSheet, episodeIndex, totalEpisodes]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
    revealControls();
  };

  const seekDelta = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.currentTime + seconds, duration));
    video.currentTime = target;
    setCurrentTime(target);
    triggerSeekFlash(seconds > 0 ? 'right' : 'left');
    revealControls();
  };

  const triggerSeekFlash = (direction: 'left' | 'right') => {
    setSeekFlash(direction);
    setTimeout(() => setSeekFlash(null), 600);
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('voidflix_muted', String(next));
  };

  const handleVolumeInput = (val: number) => {
    setVolume(val);
    setIsMuted(val === 0);
    localStorage.setItem('voidflix_volume', String(val));
    localStorage.setItem('voidflix_muted', String(val === 0));
  };

  const toggleFullscreen = () => {
    if (!frameRef.current) return;
    if (!document.fullscreenElement) {
      frameRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const changeLevel = (lvlIndex: number) => {
    setCurrentLevel(lvlIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = lvlIndex;
    }
    if (lvlIndex === -1) {
      setCurrentQualityLabel('Auto');
    } else {
      const lvl = qualityLevels.find(q => q.index === lvlIndex);
      if (lvl) setCurrentQualityLabel(lvl.label);
    }
    setActiveSheet('none');
    revealControls();
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (videoRef.current) {
      videoRef.current.playbackRate = s;
    }
    setActiveSheet('none');
    revealControls();
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (videoRef.current) {
      videoRef.current.currentTime = t;
    }
  };

  // Video Event Handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const cur = video.currentTime;
    const dur = video.duration;
    setCurrentTime(cur);
    setDuration(dur);

    if (video.buffered.length > 0) {
      setBufferedPct((video.buffered.end(video.buffered.length - 1) / dur) * 100);
    }

    // Auto save history progress every 4s
    if (cur > 5 && Math.floor(cur) % 4 === 0) {
      saveProgress({
        seriesId,
        seriesTitle,
        chapterId: episode.chapter_id,
        chapterTitle: episode.chapter_name || `Episode ${episodeIndex + 1}`,
        thumbnail: episode.chapter_thumbnail || poster || '',
        currentTime: Math.floor(cur),
        duration: Math.floor(dur),
        updatedAt: Date.now()
      });
    }
  };

  // Single tap & Double tap handling (FlowFlix Spec)
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const isLeft = clickX < rect.width * 0.35;
    const isRight = clickX > rect.width * 0.65;

    if (now - lastTapRef.current.time < 300) {
      // Double tap seek
      if (isLeft) {
        seekDelta(-10);
      } else if (isRight) {
        seekDelta(10);
      } else {
        togglePlay();
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      // Single tap toggle controls
      lastTapRef.current = { time: now, x: clickX };
      setTimeout(() => {
        if (Date.now() - lastTapRef.current.time >= 280) {
          setShowControls(prev => !prev);
        }
      }, 300);
    }
  };

  const playedPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const epTitle = episode.chapter_name || `Episode ${episodeIndex + 1}`;

  return (
    <div
      ref={frameRef}
      onMouseMove={revealControls}
      onMouseLeave={() => scheduleHideControls(800)}
      className={`vf-frame relative w-full aspect-video select-none overflow-hidden sm:rounded-2xl sm:border sm:border-white/10 shadow-2xl ${
        !showControls ? 'controls-hidden' : ''
      }`}
    >
      {/* Native HTML5 Video Element */}
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        poster={episode.chapter_thumbnail || poster}
        onPlay={() => { setIsPlaying(true); scheduleHideControls(); }}
        onPause={() => { setIsPlaying(false); revealControls(); }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          if (autoPlayNext && onNextEpisode && episodeIndex + 1 < totalEpisodes) {
            onNextEpisode();
          }
        }}
        className="absolute inset-0 w-full h-full object-contain bg-black"
      />

      {/* Tap layer covering video canvas */}
      <div
        id="tap-layer"
        onClick={handleTap}
        className="absolute inset-0 z-10 cursor-pointer"
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 z-15 flex items-center justify-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-white/20 border-t-[#E50914] animate-spin" />
        </div>
      )}

      {/* Double Tap Seek Feedback Flashes */}
      <div className={`seek-flash left-0 ${seekFlash === 'left' ? 'show' : ''}`}>
        <div className="seek-flash-pill">
          <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5"/>
            <text x="12" y="15.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">10</text>
          </svg>
          <span>10s</span>
        </div>
      </div>

      <div className={`seek-flash right-0 ${seekFlash === 'right' ? 'show' : ''}`}>
        <div className="seek-flash-pill">
          <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-3-6.7L21 8"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v5h-5"/>
            <text x="12" y="15.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">10</text>
          </svg>
          <span>10s</span>
        </div>
      </div>

      {/* ============ FLOWFLIX CONTROLS OVERLAY ============ */}
      <div className="vf-controls absolute inset-0 z-20 flex flex-col justify-between pointer-events-none">

        {/* Top Bar (Back, Title, Download) */}
        <div className="vf-top pointer-events-auto flex items-center gap-2 sm:gap-3 px-3 sm:px-6 pt-3 sm:pt-4 pb-10">
          <a
            href={`#/series/${seriesId}`}
            className="vf-icon-btn"
            title="Back to Series"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-xs sm:text-base text-white truncate leading-tight">
              {seriesTitle}
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-300 truncate">
              {epTitle} <span className="text-gray-500">• {episodeIndex + 1} of {totalEpisodes}</span>
            </p>
          </div>

          <button
            onClick={() => setActiveSheet(activeSheet === 'download' ? 'none' : 'download')}
            className="vf-icon-btn"
            title="Download Episode"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          </button>
        </div>

        {/* Center Floating Transport (FlowFlix Clean Spec) */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-8 sm:gap-20">
          <button
            onClick={(e) => { e.stopPropagation(); seekDelta(-10); }}
            className="vf-transport-clean pointer-events-auto"
            title="Rewind 10s (J / Left)"
          >
            <svg className="w-8 h-8 sm:w-12 sm:h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <text x="12" y="15" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none" textAnchor="middle">10</text>
            </svg>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="vf-transport-clean pointer-events-auto"
            title={isPlaying ? 'Pause (Space / K)' : 'Play (Space / K)'}
          >
            {isPlaying ? (
              <svg className="w-12 h-12 sm:w-16 sm:h-16 fill-current text-white hover:text-[#E50914] transition-colors" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-12 h-12 sm:w-16 sm:h-16 fill-current text-white hover:text-[#E50914] transition-colors ml-1" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); seekDelta(10); }}
            className="vf-transport-clean pointer-events-auto"
            title="Forward 10s (L / Right)"
          >
            <svg className="w-8 h-8 sm:w-12 sm:h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <text x="12" y="15" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none" textAnchor="middle">10</text>
            </svg>
          </button>
        </div>

        {/* Right-Side Vertical Brightness Slider (Desktop Only) */}
        <div className="hidden sm:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-2 pointer-events-auto select-none opacity-80 hover:opacity-100 transition-opacity">
          <button
            onClick={() => setBrightness(1)}
            className="text-white hover:scale-110 transition-transform"
            title="Reset Brightness (100%)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </button>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const val = Math.max(0.3, Math.min(1.7, (rect.bottom - e.clientY) / rect.height * 1.5 + 0.3));
              setBrightness(val);
              localStorage.setItem('voidflix_brightness', String(val));
            }}
            className="relative w-1.5 h-24 rounded-full bg-white/20 backdrop-blur-sm cursor-pointer py-1"
            title="Adjust Brightness"
          >
            <div
              className="absolute bottom-0 inset-x-0 bg-white rounded-full transition-all"
              style={{ height: `${Math.min(100, (brightness / 1.5) * 100)}%` }}
            />
          </div>
        </div>

        {/* Bottom Bar (Scrubber, Controls Row) */}
        <div className="vf-bottom pointer-events-auto px-3 sm:px-6 pb-2.5 sm:pb-4 pt-10 space-y-1.5 sm:space-y-2">

          {/* Timeline Scrubber Row */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="vf-timeline relative flex-1 h-5 flex items-center cursor-pointer touch-none">
              {/* Background track */}
              <div className="vf-track relative w-full h-1 bg-white/20 rounded-full overflow-hidden">
                {/* Buffer Progress */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-white/30 rounded-full transition-all"
                  style={{ width: `${bufferedPct}%` }}
                />
                {/* Played Progress (FlowFlix Crimson Red) */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-[#E50914] rounded-full"
                  style={{ width: `${playedPct}%` }}
                />
              </div>

              {/* Thumb */}
              <div
                className="vf-thumb absolute top-1/2 w-3.5 h-3.5 rounded-full bg-[#E50914] border-2 border-white pointer-events-none"
                style={{ left: `${playedPct}%` }}
              />

              {/* Interactive Range Input */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleScrubberChange}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-full z-10"
              />
            </div>

            {/* Elapsed / Remaining Countdown Display (FlowFlix Tabular Numbers) */}
            <div className="text-[11px] sm:text-xs font-mono font-bold text-gray-300 tabular-nums flex-shrink-0">
              <span>{formatTime(currentTime)}</span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-gray-400">{formatRemaining(currentTime, duration)}</span>
            </div>
          </div>

          {/* Bottom Controls Action Row */}
          <div className="flex items-center justify-between text-white text-xs">

            {/* Left Controls Group (Play, Quality, Speed, Subtitles, Episodes, Next) */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-0.5">
              {/* Play / Pause Toggle */}
              <button
                onClick={togglePlay}
                className="vf-action-pill"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>

              {/* Quality Pill */}
              <button
                onClick={() => setActiveSheet(activeSheet === 'settings' ? 'none' : 'settings')}
                className="vf-action-pill"
                title="Video Quality"
              >
                <span className="text-white font-bold">{currentQualityLabel}</span>
              </button>

              {/* Speed Pill */}
              <button
                onClick={() => setActiveSheet(activeSheet === 'settings' ? 'none' : 'settings')}
                className="vf-action-pill"
                title="Playback Speed"
              >
                <span>{speed}x</span>
              </button>

              {/* Audio & Subtitles Pill */}
              <button
                onClick={() => setActiveSheet(activeSheet === 'subtitles' ? 'none' : 'subtitles')}
                className="vf-action-pill"
                title="Audio & Subtitles"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                </svg>
                <span className="hidden sm:inline">Audio &amp; Subs</span>
              </button>

              {/* Episodes Drawer Toggle */}
              {totalEpisodes > 1 && (
                <button
                  onClick={() => setActiveSheet(activeSheet === 'drawer' ? 'none' : 'drawer')}
                  className="vf-action-pill"
                  title="Episode Drawer (E)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  <span className="hidden sm:inline">Episodes</span>
                </button>
              )}

              {/* Next Episode Quick Button */}
              {onNextEpisode && episodeIndex + 1 < totalEpisodes && (
                <button
                  onClick={onNextEpisode}
                  className="vf-action-pill"
                  title="Next Episode (N)"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                  </svg>
                  <span className="hidden sm:inline">Next Ep.</span>
                </button>
              )}
            </div>

            {/* Right Controls Group (Volume, Fullscreen) */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Volume Slider */}
              <div className="vf-volume flex items-center gap-1.5">
                <button
                  onClick={toggleMute}
                  className="vf-action-pill p-1.5"
                  title="Mute (M)"
                >
                  {isMuted || volume === 0 ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#E50914]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                    </svg>
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeInput(parseFloat(e.target.value))}
                  className="vf-volume-slider hidden sm:block h-1 accent-[#E50914] bg-white/20 rounded-full cursor-pointer"
                />
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="vf-action-pill p-1.5"
                title="Fullscreen (F)"
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0h5M4 4v5m11 11l5 5m0 0h-5m5 0v-5m-5-11l5-5m0 0v5m0-5h-5M4 20l5-5m-5 5v-5m0 5h5"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ AUDIO & SUBTITLES BOTTOM SHEET ============ */}
      {activeSheet === 'subtitles' && (
        <>
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setActiveSheet('none')} />
          <div className="vf-sheet z-40 overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E50914]" />
                Audio &amp; Subtitles
              </h4>
              <button onClick={() => setActiveSheet('none')} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <h5 className="vf-sheet-title">Audio Track</h5>
                <div className="p-2.5 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-between border border-[#E50914]/40">
                  <span>Japanese (Original)</span>
                  <span className="text-[#E50914] font-bold">✓</span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="vf-sheet-title">Subtitles</h5>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {['English (Hardsubbed / Softsub)', 'Off'].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => { setSelectedSub(sub); setActiveSheet('none'); }}
                      className={`w-full text-left p-2 rounded-lg transition flex items-center justify-between ${
                        selectedSub === sub ? 'bg-[#E50914] text-white font-bold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span>{sub}</span>
                      {selectedSub === sub && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============ PLAYBACK SETTINGS SHEET ============ */}
      {activeSheet === 'settings' && (
        <>
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setActiveSheet('none')} />
          <div className="vf-sheet z-40 overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E50914]" />
                Playback Settings
              </h4>
              <button onClick={() => setActiveSheet('none')} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Quality Levels */}
              <div className="space-y-2">
                <h5 className="vf-sheet-title">Quality</h5>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  <button
                    onClick={() => changeLevel(-1)}
                    className={`w-full text-left p-2 rounded-lg transition flex items-center justify-between ${
                      currentLevel === -1 ? 'bg-[#E50914] text-white font-bold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <span>Auto (Adaptive)</span>
                    {currentLevel === -1 && <span>✓</span>}
                  </button>
                  {qualityLevels.map((lvl) => (
                    <button
                      key={lvl.index}
                      onClick={() => changeLevel(lvl.index)}
                      className={`w-full text-left p-2 rounded-lg transition flex items-center justify-between ${
                        currentLevel === lvl.index ? 'bg-[#E50914] text-white font-bold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span>{lvl.label} Full HD</span>
                      {currentLevel === lvl.index && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback Speed & AutoPlay */}
              <div className="space-y-3">
                <h5 className="vf-sheet-title">Speed</h5>
                <div className="grid grid-cols-3 gap-1">
                  {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`py-1.5 rounded-lg text-center font-semibold transition ${
                        speed === s ? 'bg-[#E50914] text-white' : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/10">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 cursor-pointer">
                    <span className="text-[11px] text-gray-200">Auto-play next episode</span>
                    <input
                      type="checkbox"
                      checked={autoPlayNext}
                      onChange={(e) => {
                        setAutoPlayNext(e.target.checked);
                        localStorage.setItem('voidflix_autoplay', String(e.target.checked));
                      }}
                      className="w-3.5 h-3.5 accent-[#E50914]"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============ IN-PLAYER EPISODE DRAWER ============ */}
      {activeSheet === 'drawer' && (
        <>
          <div className="absolute inset-0 z-35 bg-black/60 backdrop-blur-sm" onClick={() => setActiveSheet('none')} />
          <div className="vf-drawer open absolute top-0 bottom-0 right-0 z-40 w-full sm:w-80 bg-[#070709]/95 backdrop-blur-xl border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                Episodes · {episodes.length} Available
              </h4>
              <button onClick={() => setActiveSheet('none')} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 no-scrollbar">
              {episodes.map((ep, idx) => {
                const active = idx === episodeIndex;
                return (
                  <button
                    key={ep.chapter_id || idx}
                    onClick={() => {
                      onSelectEpisode(idx);
                      setActiveSheet('none');
                    }}
                    className={`w-full text-left flex items-center gap-3 p-2 rounded-xl transition ${
                      active ? 'bg-[#E50914]/20 ring-1 ring-[#E50914] text-white' : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-carbon-800 flex-shrink-0">
                      <img
                        src={ep.chapter_thumbnail || poster}
                        alt={ep.chapter_name || `Episode ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {active && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] font-extrabold text-[#E50914] uppercase tracking-wider">
                          Playing
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${active ? 'text-[#E50914] font-bold' : 'text-white'}`}>
                        {ep.chapter_name || `Episode ${idx + 1}`}
                      </p>
                      <span className="text-[10px] text-gray-500">1080p FHD</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ============ DOWNLOAD MODAL ============ */}
      {activeSheet === 'download' && (
        <>
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setActiveSheet('none')} />
          <div className="vf-sheet z-40 overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 space-y-4 max-w-md mx-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="font-bold text-sm text-white">Download Episode</h4>
              <button onClick={() => setActiveSheet('none')} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Download the master HLS streaming playlist file to play directly in VLC, PotPlayer, MPV, or download as MP4 with yt-dlp.
            </p>

            <div className="space-y-2 pt-2">
              <a
                href={streamUrl}
                download={`${seriesTitle} - ${epTitle}.m3u8`}
                className="w-full py-2.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#b81d24] text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <span>Download M3U8 Playlist File</span>
              </a>

              <button
                onClick={() => {
                  const cmd = `yt-dlp "${streamUrl}" -o "${seriesTitle} - ${epTitle}.mp4"`;
                  navigator.clipboard.writeText(cmd);
                  alert('Copied yt-dlp terminal command to clipboard!');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition"
              >
                <span>Copy yt-dlp Command (Download as MP4)</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
