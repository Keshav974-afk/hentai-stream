import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Layers,
  SkipBack,
  SkipForward,
  Tv,
  Check
} from 'lucide-react';
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
  onToggleTheater
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  const { saveProgress, getProgress } = useWatchHistory();

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    return parseFloat(localStorage.getItem('voidflix_volume') || '1');
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('voidflix_muted') === 'true';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [qualityLevels, setQualityLevels] = useState<VideoQualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'none' | 'settings' | 'episodes'>('none');
  const [seekFeedback, setSeekFeedback] = useState<{ side: 'left' | 'right'; text: string } | null>(null);
  const [hasAutoResumed, setHasAutoResumed] = useState(false);

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

  // Autohide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && activeMenu === 'none') {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [isPlaying, activeMenu]);

  // HLS stream attachment & cleanup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setHasAutoResumed(false);

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
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

        // Resume saved progress if available
        const saved = getProgress(seriesId, episode.chapter_id);
        if (saved && saved.currentTime > 10 && saved.currentTime < saved.duration - 15) {
          video.currentTime = saved.currentTime;
          setCurrentTime(saved.currentTime);
        }

        // Attempt playback
        video.play().catch(() => {
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        const saved = getProgress(seriesId, episode.chapter_id);
        if (saved && saved.currentTime > 10) {
          video.currentTime = saved.currentTime;
        }
        video.play().catch(() => setIsPlaying(false));
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, episode.chapter_id, seriesId]);

  // Sync volume with element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if typing in search input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          seekDelta(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          seekDelta(10);
          break;
        case 'arrowup':
          e.preventDefault();
          changeVolume(0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          changeVolume(-0.1);
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, isFullscreen, onToggleTheater]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetControlsTimer();
  };

  const seekDelta = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.currentTime + delta, duration));
    video.currentTime = target;
    setCurrentTime(target);
    triggerSeekFeedback(delta > 0 ? 'right' : 'left', `${delta > 0 ? '+' : ''}${delta}s`);
    resetControlsTimer();
  };

  const triggerSeekFeedback = (side: 'left' | 'right', text: string) => {
    setSeekFeedback({ side, text });
    setTimeout(() => setSeekFeedback(null), 600);
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('voidflix_muted', String(nextMuted));
    resetControlsTimer();
  };

  const changeVolume = (delta: number) => {
    const next = Math.max(0, Math.min(1, volume + delta));
    setVolume(next);
    setIsMuted(next === 0);
    localStorage.setItem('voidflix_volume', String(next));
    localStorage.setItem('voidflix_muted', String(next === 0));
    resetControlsTimer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    localStorage.setItem('voidflix_volume', String(val));
    localStorage.setItem('voidflix_muted', String(val === 0));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const setQuality = (levelIndex: number) => {
    setCurrentQuality(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
    setActiveMenu('none');
    resetControlsTimer();
  };

  const setSpeed = (spd: number) => {
    setPlaybackSpeed(spd);
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
    }
    setActiveMenu('none');
    resetControlsTimer();
  };

  // Mobile Touch Gestures: Double-tap seek, single tap controls
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const isLeft = x < rect.width * 0.4;
    const isRight = x > rect.width * 0.6;

    if (now - lastTapRef.current.time < 300) {
      // Double tap detected
      if (isLeft) {
        seekDelta(-10);
      } else if (isRight) {
        seekDelta(10);
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      // Single tap
      lastTapRef.current = { time: now, x };
      setTimeout(() => {
        if (Date.now() - lastTapRef.current.time >= 280) {
          setShowControls((prev) => !prev);
        }
      }, 300);
    }
  };

  // Video Time Update & Progress Save
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(cur);
    setDuration(dur);

    // Track buffered range
    if (videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }

    // Auto-save history every 4 seconds
    if (cur > 5 && dur > 0 && Math.floor(cur) % 4 === 0) {
      saveProgress({
        seriesId,
        seriesTitle,
        chapterId: episode.chapter_id,
        chapterTitle: episode.chapter_name || `Episode ${episodeIndex + 1}`,
        thumbnail: episode.chapter_thumbnail || '',
        currentTime: Math.floor(cur),
        duration: Math.floor(dur),
        updatedAt: Date.now()
      });
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onNextEpisode && episodeIndex + 1 < totalEpisodes) {
      onNextEpisode();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onTouchEnd={handleTouchEnd}
      className={`relative select-none bg-black overflow-hidden font-sans ${
        isFullscreen
          ? 'w-screen h-screen'
          : isTheaterMode
          ? 'w-full aspect-[21/9] min-h-[450px] max-h-[82vh]'
          : 'w-full aspect-video rounded-2xl border border-white/10 shadow-2xl'
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Double Tap Visual Indicator */}
      {seekFeedback && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center p-4 rounded-full bg-carbon-900/80 backdrop-blur-md text-white border border-white/15 animate-ping-short ${
            seekFeedback.side === 'left' ? 'left-1/4' : 'right-1/4'
          }`}
        >
          {seekFeedback.side === 'left' ? (
            <RotateCcw className="w-8 h-8 text-cinema-red" />
          ) : (
            <RotateCw className="w-8 h-8 text-cinema-red" />
          )}
          <span className="text-xs font-bold mt-1">{seekFeedback.text}</span>
        </div>
      )}

      {/* Top Bar Overlay: Episode Title & Quick Switch */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between text-white">
          <div className="flex flex-col min-w-0 pr-4">
            <span className="text-xs text-gray-400 font-medium truncate">{seriesTitle}</span>
            <h3 className="text-sm sm:text-base font-bold truncate">
              {episode.chapter_name || `Episode ${episodeIndex + 1}`}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMenu(activeMenu === 'episodes' ? 'none' : 'episodes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md border transition ${
                activeMenu === 'episodes'
                  ? 'bg-cinema-red border-cinema-red text-white'
                  : 'bg-black/60 border-white/15 text-gray-200 hover:bg-black/80 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Episodes ({episodeIndex + 1}/{totalEpisodes})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Center Play/Pause Large Action (Visible when paused) */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cinema-red flex items-center justify-center text-white shadow-2xl transform hover:scale-110 active:scale-95 transition">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Episodes Drawer Menu */}
      {activeMenu === 'episodes' && (
        <div className="absolute top-14 right-4 bottom-16 z-30 w-72 sm:w-80 bg-carbon-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Episodes List</h4>
            <span className="text-[11px] text-gray-400 font-medium">{totalEpisodes} Available</span>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {episodes.map((ep, idx) => {
              const active = idx === episodeIndex;
              return (
                <button
                  key={ep.chapter_id || idx}
                  onClick={() => {
                    onSelectEpisode(idx);
                    setActiveMenu('none');
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-xs transition ${
                    active
                      ? 'bg-cinema-red text-white font-bold'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2">
                    {ep.chapter_name || `Episode ${idx + 1}`}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 flex-none" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Settings (Quality & Speed) Menu */}
      {activeMenu === 'settings' && (
        <div className="absolute bottom-16 right-4 z-30 w-56 bg-carbon-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-3 text-white text-xs space-y-3 animate-fadeIn">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
              Playback Speed
            </span>
            <div className="grid grid-cols-3 gap-1">
              {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSpeed(spd)}
                  className={`py-1 rounded text-center transition ${
                    playbackSpeed === spd
                      ? 'bg-cinema-red text-white font-bold'
                      : 'bg-white/5 hover:bg-white/15 text-gray-300'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {qualityLevels.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Resolution Quality
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                <button
                  onClick={() => setQuality(-1)}
                  className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition ${
                    currentQuality === -1
                      ? 'bg-cinema-red text-white font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <span>Auto (Adaptive)</span>
                  {currentQuality === -1 && <Check className="w-3.5 h-3.5" />}
                </button>
                {qualityLevels.map((lvl) => (
                  <button
                    key={lvl.index}
                    onClick={() => setQuality(lvl.index)}
                    className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition ${
                      currentQuality === lvl.index
                        ? 'bg-cinema-red text-white font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <span>{lvl.label}</span>
                    {currentQuality === lvl.index && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 space-y-2 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Range Slider */}
        <div className="relative w-full group/scrub flex items-center h-4 cursor-pointer">
          {/* Buffer Progress */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-white/20 rounded-full pointer-events-none"
            style={{ width: `${duration > 0 ? (buffered / duration) * 100 : 0}%` }}
          />
          {/* Played Progress */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-cinema-red rounded-full pointer-events-none"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
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

        {/* Lower Controls Row */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Actions: Play/Pause, Rewind, Forward, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 hover:text-cinema-red transition focus:outline-none"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {onPrevEpisode && episodeIndex > 0 && (
              <button
                onClick={onPrevEpisode}
                className="p-1.5 hover:text-cinema-red transition focus:outline-none hidden sm:block"
                title="Previous Episode"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>
            )}

            <button
              onClick={() => seekDelta(-10)}
              className="p-1.5 hover:text-cinema-red transition focus:outline-none"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => seekDelta(10)}
              className="p-1.5 hover:text-cinema-red transition focus:outline-none"
              title="Forward 10 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {onNextEpisode && episodeIndex + 1 < totalEpisodes && (
              <button
                onClick={onNextEpisode}
                className="p-1.5 hover:text-cinema-red transition focus:outline-none"
                title="Next Episode"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            )}

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 hover:text-cinema-red transition focus:outline-none"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-cinema-red" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/20 accent-cinema-red rounded-lg cursor-pointer"
              />
            </div>

            {/* Timestamp */}
            <span className="text-[11px] font-mono text-gray-300 ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Actions: Theater, Quality/Speed, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onToggleTheater && (
              <button
                onClick={onToggleTheater}
                className={`p-1.5 transition hidden md:block focus:outline-none ${
                  isTheaterMode ? 'text-cinema-red' : 'text-gray-300 hover:text-white'
                }`}
                title="Theater Mode (T)"
              >
                <Tv className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setActiveMenu(activeMenu === 'settings' ? 'none' : 'settings')}
              className={`p-1.5 transition focus:outline-none ${
                activeMenu === 'settings' ? 'text-cinema-red' : 'text-gray-300 hover:text-white'
              }`}
              title="Settings & Quality"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-gray-300 hover:text-white transition focus:outline-none"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
