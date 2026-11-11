import React, { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Captions,
  PictureInPicture2,
  SkipForward,
  RotateCcw,
  RotateCw,
  Loader2,
  Check,
  Gauge,
  Sun,
  ArrowLeft,
  LayoutGrid,
  Download,
  X,
  Copy,
  Link,
  ExternalLink,
  Radio
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
  onBack?: () => void;
  poster?: string;
  startTime?: number;
}

type SheetView = 'none' | 'speed' | 'quality' | 'audiosubs' | 'episodes' | 'download' | 'directlink';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

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
  onBack,
  poster = '',
  startTime = 0
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const forcedMuteRef = useRef(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekRef = useRef<HTMLDivElement>(null);
  const isDraggingSeek = useRef(false);

  const { saveProgress } = useWatchHistory();
  const saveProgressRef = useRef(saveProgress);
  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  // Keep parent callbacks in ref so re-renders do NOT tear down HLS.js
  const cbRef = useRef({
    onSelectEpisode,
    onNextEpisode,
    onPrevEpisode,
    onBack,
    onToggleTheater,
  });
  useEffect(() => {
    cbRef.current = {
      onSelectEpisode,
      onNextEpisode,
      onPrevEpisode,
      onBack,
      onToggleTheater,
    };
  });

  // Active Stream URL (Supports streamUrl or user-entered custom direct link)
  const [activeUrl, setActiveUrl] = useState<string>(streamUrl);
  const [playbackMode, setPlaybackMode] = useState<'hls' | 'direct'>('hls');
  const [customLinkInput, setCustomLinkInput] = useState<string>('');
  const [streamReloadNonce, setStreamReloadNonce] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Keep activeUrl in sync with streamUrl prop updates
  useEffect(() => {
    setActiveUrl(streamUrl);
  }, [streamUrl]);

  // Playback & State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
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
  const [activeSheet, setActiveSheet] = useState<SheetView>('none');
  const [seekFlash, setSeekFlash] = useState<{ side: 'l' | 'r'; id: number } | null>(null);
  const [hoverSeek, setHoverSeek] = useState<{ pct: number; time: number } | null>(null);
  const [selectedSub, setSelectedSub] = useState<string>('en');

  // Format seconds to mm:ss or hh:mm:ss (FlowFlix standard)
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const s = Math.floor(secs);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
  };

  const formatRemaining = (cur: number, dur: number) => {
    if (isNaN(dur) || dur <= 0) return '00:00';
    const rem = Math.max(0, dur - cur);
    return formatTime(rem);
  };

  const scheduleHideControls = useCallback((delay = 3200) => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && activeSheet === 'none') {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, delay);
    }
  }, [isPlaying, activeSheet]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  // Keep auto-unmute listener on first user gesture
  useEffect(() => {
    const handleFirstGesture = () => {
      const v = videoRef.current;
      if (v && v.muted && forcedMuteRef.current) {
        v.muted = false;
        setIsMuted(false);
        forcedMuteRef.current = false;
      }
    };
    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const reloadStream = useCallback(() => {
    setPlaybackError(null);
    setIsBuffering(true);
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }
    setStreamReloadNonce(n => n + 1);
  }, []);

  // Primary Video & HLS Lifecycle Engine (FlowFlix / VidSrc spec)
  // Depends ONLY on activeUrl, playbackMode, startTime, and streamReloadNonce
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeUrl) return;

    let hlsInstance: any = null;
    let netRetries = 0;
    setIsBuffering(true);
    setPlaybackError(null);

    const HlsClass = (typeof window !== 'undefined' && (window as any).Hls) || Hls;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const canPlayNativeHls = Boolean(video.canPlayType('application/vnd.apple.mpegurl'));
    const isDirectMp4 = activeUrl.includes('.mp4') || activeUrl.includes('.webm') || activeUrl.includes('.m4v');

    const attemptPlay = () => {
      const savedMuted = localStorage.getItem('voidflix_muted') === 'true';
      video.muted = savedMuted;

      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch(() => {
          // Autoplay blocked by browser: fallback to muted autoplay and unmute on first tap
          video.muted = true;
          setIsMuted(true);
          forcedMuteRef.current = true;
          video.play().then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          }).catch(() => {
            setIsPlaying(false);
            setIsBuffering(false);
          });
        });
      }
    };

    // Native playback mode for MP4 or native Apple HLS (Safari/iOS)
    if (isDirectMp4 || (canPlayNativeHls && (playbackMode === 'direct' || isSafari || isIOS))) {
      video.src = activeUrl;
      const onLoaded = () => {
        if (startTime > 0 && video.currentTime < 1) {
          try {
            video.currentTime = startTime;
            setCurrentTime(startTime);
          } catch {}
        }
        setIsBuffering(false);
        setPlaybackError(null);
        attemptPlay();
      };
      const onErr = () => {
        setIsBuffering(false);
        setPlaybackError('Native player failed to load direct stream. Please retry or open in VLC.');
      };

      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onErr, { once: true });

      return () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onErr);
        video.removeAttribute('src');
        video.load();
      };
    }

    // High performance HLS.js engine
    if (HlsClass && HlsClass.isSupported()) {
      hlsInstance = new HlsClass({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 30,
        maxFragLookUpTolerance: 0.25,
        startFragPrefetch: false,
        capLevelToPlayerSize: false,
        abrEwmaDefaultEstimate: 5000000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.9,
        backBufferLength: 60,
        startPosition: startTime > 0 ? startTime : -1,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeMaxRetry: 5,
        nudgeOffset: 0.1,
      });

      hlsRef.current = hlsInstance;

      hlsInstance.loadSource(activeUrl);
      hlsInstance.attachMedia(video);

      hlsInstance.on(HlsClass.Events.MANIFEST_PARSED, (_: any, data: any) => {
        setIsBuffering(false);
        setPlaybackError(null);

        const levels: VideoQualityLevel[] = (data.levels || []).map((lvl: any, index: number) => ({
          index,
          height: lvl.height,
          bitrate: lvl.bitrate,
          label: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`
        }));
        setQualityLevels(levels);

        if (startTime > 0 && video.currentTime < 1) {
          try {
            video.currentTime = startTime;
            setCurrentTime(startTime);
          } catch {}
        }

        attemptPlay();
      });

      hlsInstance.on(HlsClass.Events.LEVEL_SWITCHED, (_: any, data: any) => {
        setCurrentLevel(data.level);
        if (data.level === -1) {
          setCurrentQualityLabel('Auto');
        } else if (hlsInstance?.levels?.[data.level]) {
          setCurrentQualityLabel(`${hlsInstance.levels[data.level].height}p`);
        }
      });

      hlsInstance.on(HlsClass.Events.ERROR, (_: any, data: any) => {
        if (!data.fatal) return;
        if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
          if (netRetries < 5) {
            netRetries += 1;
            console.warn(`HLS Network error -> recovery attempt ${netRetries}/5`, data);
            hlsInstance.startLoad();
          } else {
            console.error('Fatal HLS Network Error', data);
            setIsBuffering(false);
            setPlaybackError('Stream failed to load due to network error. Click Retry or use Direct Link.');
          }
        } else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
          console.warn('HLS Media error -> auto recovering media', data);
          hlsInstance.recoverMediaError();
        } else {
          console.error('Fatal unrecoverable HLS error', data);
          try {
            hlsInstance.destroy();
          } catch {}
          hlsRef.current = null;
          setIsBuffering(false);
          setPlaybackError('Playback error occurred. Click Retry or open in VLC.');
        }
      });

      return () => {
        hlsRef.current = null;
        try {
          hlsInstance.destroy();
        } catch {}
      };
    }

    if (canPlayNativeHls) {
      video.src = activeUrl;
      const onLoaded = () => {
        if (startTime > 0 && video.currentTime < 1) {
          try {
            video.currentTime = startTime;
            setCurrentTime(startTime);
          } catch {}
        }
        setIsBuffering(false);
        setPlaybackError(null);
        attemptPlay();
      };
      const onErr = () => {
        setIsBuffering(false);
        setPlaybackError('Native playback failed to load stream. Click Retry.');
      };
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onErr, { once: true });
      return () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onErr);
        video.removeAttribute('src');
        video.load();
      };
    }

    setIsBuffering(false);
    setPlaybackError('HLS playback is not supported on this browser.');
  }, [activeUrl, playbackMode, startTime, streamReloadNonce]);

  // Sync Volume & Brightness
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      videoRef.current.style.filter = brightness !== 1 ? `brightness(${brightness})` : '';
    }
  }, [volume, isMuted, brightness]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // Keyboard Navigation (FlowFlix Spec)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      revealControls();

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
          setActiveSheet(activeSheet === 'episodes' ? 'none' : 'episodes');
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
  }, [isPlaying, volume, isMuted, activeSheet, episodeIndex, totalEpisodes, revealControls]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    forcedMuteRef.current = false;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      }).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
    revealControls();
  };

  const seekDelta = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const target = Math.max(0, Math.min(video.currentTime + seconds, video.duration));
    video.currentTime = target;
    setCurrentTime(target);
    flashSeek(seconds > 0 ? 'r' : 'l');
    revealControls();
  };

  const flashSeek = (side: 'l' | 'r') => {
    const id = Date.now();
    setSeekFlash({ side, id });
    setTimeout(() => {
      setSeekFlash((prev) => (prev?.id === id ? null : prev));
    }, 550);
  };

  const toggleMute = () => {
    forcedMuteRef.current = false;
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('voidflix_muted', String(next));
    if (!next && volume === 0) {
      setVolume(1);
      localStorage.setItem('voidflix_volume', '1');
    }
  };

  const handleVolumeChange = (val: number) => {
    forcedMuteRef.current = false;
    setVolume(val);
    const muted = val === 0;
    setIsMuted(muted);
    localStorage.setItem('voidflix_volume', String(val));
    localStorage.setItem('voidflix_muted', String(muted));
  };

  const toggleFullscreen = () => {
    if (!frameRef.current) return;
    if (!document.fullscreenElement) {
      frameRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // PiP not supported
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
      const lvl = qualityLevels.find((q) => q.index === lvlIndex);
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

  // Video time update & event handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const cur = video.currentTime;
    const dur = video.duration;
    if (!isDraggingSeek.current) {
      setCurrentTime(cur);
    }
    setDuration(dur);

    if (video.buffered.length > 0) {
      try {
        setBufferedPct((video.buffered.end(video.buffered.length - 1) / dur) * 100);
      } catch {}
    }

    // Auto save history progress every 5s using stable ref
    if (cur > 5 && Math.floor(cur) % 5 === 0) {
      saveProgressRef.current({
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

  // Seek bar interaction (FlowFlix zero-jitter scrub engine)
  const getSeekFracTime = (clientX: number) => {
    const bar = seekRef.current;
    const video = videoRef.current;
    if (!bar || !video || !video.duration) return null;
    const rect = bar.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return frac * video.duration;
  };

  const onSeekDown = (e: React.PointerEvent) => {
    isDraggingSeek.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const t = getSeekFracTime(e.clientX);
    if (t !== null) {
      setCurrentTime(t);
    }
  };

  const onSeekMove = (e: React.PointerEvent) => {
    const t = getSeekFracTime(e.clientX);
    const dur = videoRef.current?.duration || duration;
    if (t !== null && dur > 0) {
      setHoverSeek({ pct: (t / dur) * 100, time: t });
    }
    if (isDraggingSeek.current && t !== null) {
      setCurrentTime(t);
    }
  };

  const onSeekUp = (e: React.PointerEvent) => {
    if (isDraggingSeek.current) {
      isDraggingSeek.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      const video = videoRef.current;
      const t = getSeekFracTime(e.clientX);
      if (video && t !== null) {
        video.currentTime = t;
      }
    }
  };

  // Single-tap & Double-tap surface click
  const onSurfaceClick = () => {
    if (activeSheet !== 'none') {
      setActiveSheet('none');
      return;
    }
    if (showControls) {
      setShowControls(false);
    } else {
      revealControls();
    }
  };

  const onDoubleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / Math.max(1, rect.width);

    if (xRatio < 0.35) {
      seekDelta(-10);
    } else if (xRatio > 0.65) {
      seekDelta(10);
    } else {
      toggleFullscreen();
    }
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const epTitle = episode.chapter_name || `Episode ${episodeIndex + 1}`;

  return (
    <div
      ref={frameRef}
      onMouseMove={() => revealControls()}
      onMouseLeave={() => scheduleHideControls(600)}
      className="relative w-full aspect-video select-none overflow-hidden bg-black text-white rounded-none sm:rounded-2xl sm:border sm:border-white/10 shadow-2xl group/player font-sans"
    >
      {/* Native HTML5 Video Element */}
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        poster={episode.chapter_thumbnail || poster}
        onPlay={() => {
          setIsPlaying(true);
          setIsBuffering(false);
          scheduleHideControls();
        }}
        onPause={() => {
          setIsPlaying(false);
          setIsBuffering(false);
          revealControls();
        }}
        onWaiting={() => {
          if (videoRef.current && !videoRef.current.paused) {
            setIsBuffering(true);
          }
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onCanPlay={() => setIsBuffering(false)}
        onCanPlayThrough={() => setIsBuffering(false)}
        onLoadedData={() => setIsBuffering(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          if (onNextEpisode && episodeIndex + 1 < totalEpisodes) {
            onNextEpisode();
          }
        }}
        className="absolute inset-0 h-full w-full object-contain bg-black"
      />

      {/* Tap layer covering video canvas */}
      <div
        id="tap-layer"
        onClick={onSurfaceClick}
        onDoubleClick={onDoubleTap}
        className="absolute inset-0 z-10 cursor-pointer"
      />

      {/* Double-tap Seek Flash Overlay (±10s) */}
      {seekFlash && (
        <div
          key={seekFlash.id}
          className={`pointer-events-none absolute inset-y-0 z-20 grid w-1/3 place-items-center ${
            seekFlash.side === 'l' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="flex flex-col items-center gap-1 rounded-full bg-black/60 backdrop-blur px-5 py-4 text-white animate-in fade-in zoom-in">
            {seekFlash.side === 'l' ? (
              <RotateCcw className="size-8" />
            ) : (
              <RotateCw className="size-8" />
            )}
            <span className="text-xs font-bold">10s</span>
          </div>
        </div>
      )}

      {/* Mode Indicator Pill (Top Left, subtle) */}
      <div className="absolute top-3 left-14 z-25 pointer-events-none hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur border border-white/10 text-[10px] text-gray-400">
        <Radio className="size-3 text-[#E50914]" />
        <span>{playbackMode === 'hls' ? 'HLS Engine' : 'Direct Link Mode'}</span>
      </div>

      {/* Center Buffering Spinner (Does not block play button) */}
      {isBuffering && isPlaying && !playbackError && (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/30 backdrop-blur-[1px]">
          <Loader2 className="size-12 sm:size-14 animate-spin text-[#E50914]" />
        </div>
      )}

      {/* Error / Fallback Retry Overlay */}
      {playbackError && (
        <div className="absolute inset-0 z-25 flex flex-col items-center justify-center bg-black/90 p-6 text-center space-y-3 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-[#E50914] flex items-center justify-center mb-1">
            <Radio className="size-6 animate-pulse" />
          </div>
          <p className="text-white text-sm font-semibold max-w-md">{playbackError}</p>
          <p className="text-gray-400 text-xs max-w-sm">
            You can retry playback immediately, stream in the web player, or paste the direct link in VLC / 1DM.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 pointer-events-auto">
            <button
              onClick={reloadStream}
              className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-[#b81d24] text-white text-xs font-bold transition shadow-lg cursor-pointer"
            >
              Retry Stream
            </button>
            <a
              href={`https://videojs-http-streaming.netlify.app/?src=${encodeURIComponent(activeUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition shadow-lg cursor-pointer flex items-center gap-1.5"
            >
              <ExternalLink className="size-3.5 text-[#E50914]" />
              <span>Web Player</span>
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(activeUrl);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium border border-white/10 transition flex items-center gap-1.5"
            >
              <Copy className="size-3.5" />
              <span>{copiedLink ? '✓ Copied Link' : 'Copy Direct Link'}</span>
            </button>
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium border border-white/10 transition flex items-center gap-1.5"
            >
              <ExternalLink className="size-3.5" />
              <span>Open in VLC / Tab</span>
            </a>
          </div>
        </div>
      )}

      {/* ============ CENTER TRANSPORT CONTROLS (Netflix / FlowFlix Spec) ============ */}
      {showControls && !playbackError && activeSheet === 'none' && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center gap-14 sm:gap-24 lg:gap-32 text-white">
          {/* Rewind 10s */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              seekDelta(-10);
              revealControls();
            }}
            aria-label="Back 10 seconds"
            className="pointer-events-auto relative grid place-items-center opacity-90 transition hover:scale-110 hover:opacity-100"
          >
            <RotateCcw className="size-9 sm:size-12" strokeWidth={1.5} />
            <span className="absolute text-[9px] sm:text-xs font-bold">10</span>
          </button>

          {/* Big Center Play / Pause Button - ALWAYS CLICKABLE */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="pointer-events-auto grid place-items-center opacity-95 transition hover:scale-110 hover:opacity-100"
          >
            {isPlaying ? (
              <Pause className="size-14 sm:size-18 fill-white text-white" strokeWidth={1} />
            ) : (
              <Play className="size-14 sm:size-18 translate-x-1 fill-white text-white" strokeWidth={1} />
            )}
          </button>

          {/* Forward 10s */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              seekDelta(10);
              revealControls();
            }}
            aria-label="Forward 10 seconds"
            className="pointer-events-auto relative grid place-items-center opacity-90 transition hover:scale-110 hover:opacity-100"
          >
            <RotateCw className="size-9 sm:size-12" strokeWidth={1.5} />
            <span className="absolute text-[9px] sm:text-xs font-bold">10</span>
          </button>
        </div>
      )}

      {/* ============ DESKTOP BRIGHTNESS SLIDER (Right Edge) ============ */}
      {showControls && activeSheet === 'none' && (
        <div className="hidden sm:flex absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-25 flex-col items-center gap-2 pointer-events-auto opacity-80 hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              setBrightness(1);
              localStorage.setItem('voidflix_brightness', '1');
            }}
            title="Reset Brightness (100%)"
            className="text-white/80 hover:text-white transition-colors"
          >
            <Sun className="size-4" />
          </button>
          <div className="flex h-28 w-6 items-center justify-center">
            <input
              type="range"
              min={0.4}
              max={1.6}
              step={0.05}
              value={brightness}
              onChange={(e) => {
                const b = Number(e.target.value);
                setBrightness(b);
                localStorage.setItem('voidflix_brightness', String(b));
              }}
              aria-label="Brightness"
              className="h-1 w-28 -rotate-90 cursor-pointer accent-[#E50914]"
            />
          </div>
        </div>
      )}

      {/* ============ TOP BAR ============ */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/85 via-black/40 to-transparent px-3 sm:px-6 pt-3 sm:pt-4 pb-14 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-2 text-white">
          {/* Back button */}
          <button
            onClick={() => {
              if (onBack) onBack();
              else window.location.hash = `#/series/${seriesId}`;
            }}
            aria-label="Back"
            className="grid size-9 place-items-center opacity-85 hover:opacity-100 transition-opacity"
            title="Back to Series"
          >
            <ArrowLeft className="size-6" />
          </button>

          {/* Title Header */}
          <div className="flex-1 min-w-0 text-center px-2">
            <h3 className="text-sm sm:text-base font-bold text-white truncate leading-tight drop-shadow-md">
              {seriesTitle}
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-300 truncate font-medium">
              {epTitle} <span className="text-gray-500">• {episodeIndex + 1} of {totalEpisodes}</span>
            </p>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Direct Link Switcher / Modal */}
            <button
              onClick={() => setActiveSheet(activeSheet === 'directlink' ? 'none' : 'directlink')}
              aria-label="Direct Link"
              className="grid size-9 place-items-center opacity-85 hover:opacity-100 transition-opacity"
              title="Direct Link & Custom Streams"
            >
              <Link className="size-5" />
            </button>

            {/* Download Modal Trigger */}
            <button
              onClick={() => setActiveSheet(activeSheet === 'download' ? 'none' : 'download')}
              aria-label="Download"
              className="grid size-9 place-items-center opacity-85 hover:opacity-100 transition-opacity"
              title="Download Episode"
            >
              <Download className="size-5" />
            </button>

            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              aria-label="Mute"
              className="grid size-9 place-items-center opacity-85 hover:opacity-100 transition-opacity"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>

            {/* Picture-in-Picture */}
            <button
              onClick={togglePip}
              aria-label="Picture in picture"
              className="grid size-9 place-items-center opacity-85 hover:opacity-100 transition-opacity"
              title="Picture in Picture"
            >
              <PictureInPicture2 className="size-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              aria-label="Fullscreen"
              className="grid size-9 place-items-center opacity-85 hover:opacity-100 transition-opacity"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ============ BOTTOM BAR (Netflix / FlowFlix Spec) ============ */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/50 to-transparent px-3 sm:px-8 pb-3 pt-16 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="pointer-events-auto space-y-2">
          {/* Timeline Scrubber */}
          <div className="flex items-center gap-3">
            <div
              ref={seekRef}
              onPointerDown={onSeekDown}
              onPointerMove={onSeekMove}
              onPointerUp={onSeekUp}
              onPointerLeave={() => setHoverSeek(null)}
              className="group/seek relative flex h-5 flex-1 cursor-pointer touch-none items-center"
            >
              {/* Hover Timestamp Tooltip */}
              {hoverSeek && (
                <div
                  className="pointer-events-none absolute bottom-5 -translate-x-1/2 rounded bg-black/90 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white shadow border border-white/10"
                  style={{ left: `${hoverSeek.pct}%` }}
                >
                  {formatTime(hoverSeek.time)}
                </div>
              )}

              {/* Track */}
              <div className="absolute inset-x-0 h-[3px] bg-white/25 rounded-full transition-all group-hover/seek:h-1">
                {/* Buffered track */}
                <div
                  className="absolute inset-y-0 left-0 bg-white/60 rounded-full transition-[width] duration-150"
                  style={{ width: `${bufferedPct}%` }}
                />
                {/* Hover preview ghost track */}
                {hoverSeek && (
                  <div
                    className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                    style={{ width: `${hoverSeek.pct}%` }}
                  />
                )}
                {/* Played track */}
                <div
                  className="absolute inset-y-0 left-0 bg-[#E50914] rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
                {/* Red scrubber thumb */}
                <div
                  className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E50914] shadow transition-transform group-hover/seek:scale-125"
                  style={{ left: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Remaining Time */}
            <span className="shrink-0 text-xs sm:text-[13px] font-semibold tabular-nums text-white/90">
              {formatRemaining(currentTime, duration)}
            </span>
          </div>

          {/* Bottom Row Action Buttons (FlowFlix BarButtons) */}
          <div className="flex items-center justify-between sm:justify-center sm:gap-6 lg:gap-8 pt-1 text-white">
            {/* Direct Link Switcher Pill */}
            <BarButton
              icon={<Link className="size-4 sm:size-5" />}
              label={playbackMode === 'direct' ? 'Direct: ON' : 'Direct Link'}
              onClick={() => setActiveSheet(activeSheet === 'directlink' ? 'none' : 'directlink')}
            />

            {/* Speed Pill */}
            <BarButton
              icon={<Gauge className="size-4 sm:size-5" />}
              label={`Speed (${speed}x)`}
              onClick={() => setActiveSheet(activeSheet === 'speed' ? 'none' : 'speed')}
            />

            {/* Quality Pill */}
            <BarButton
              icon={<Settings className="size-4 sm:size-5" />}
              label={`Quality${currentLevel !== -1 ? ` (${currentQualityLabel})` : ' (Auto)'}`}
              onClick={() => setActiveSheet(activeSheet === 'quality' ? 'none' : 'quality')}
            />

            {/* Episodes Picker Pill */}
            <BarButton
              icon={<LayoutGrid className="size-4 sm:size-5" />}
              label="Episodes"
              onClick={() => setActiveSheet(activeSheet === 'episodes' ? 'none' : 'episodes')}
            />

            {/* Audio & Subtitles Pill */}
            <BarButton
              icon={<Captions className="size-4 sm:size-5" />}
              label="Audio & Subs"
              onClick={() => setActiveSheet(activeSheet === 'audiosubs' ? 'none' : 'audiosubs')}
            />

            {/* Next Episode Pill (when available) */}
            {onNextEpisode && episodeIndex + 1 < totalEpisodes && (
              <BarButton
                icon={<SkipForward className="size-4 sm:size-5" />}
                label="Next Ep."
                onClick={onNextEpisode}
              />
            )}

            {/* Desktop Volume Slider */}
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-white/10">
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                aria-label="Volume"
                className="h-1 w-20 cursor-pointer accent-[#E50914]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============ BOTTOM SHEETS / MODALS (FlowFlix Spec) ============ */}
      {activeSheet !== 'none' && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setActiveSheet('none')}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85%] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#161616]/95 border border-white/10 text-white shadow-2xl backdrop-blur sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ============ DIRECT LINK MODAL ============ */}
            {activeSheet === 'directlink' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Link className="size-4 text-[#E50914]" />
                    <span>Direct Link & Stream Fallback</span>
                  </h4>
                  <button onClick={() => setActiveSheet('none')} className="text-gray-400 hover:text-white">
                    <X className="size-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-300 font-semibold block">Active Episode Direct Link:</label>
                  <div className="flex items-center gap-2 bg-black/50 p-2 rounded-xl border border-white/10">
                    <input
                      type="text"
                      readOnly
                      value={activeUrl}
                      className="bg-transparent text-xs text-gray-200 font-mono flex-1 outline-none truncate select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeUrl);
                        alert('Copied direct link to clipboard!');
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0"
                      title="Copy Link"
                    >
                      <Copy className="size-4" />
                    </button>
                    <a
                      href={`https://videojs-http-streaming.netlify.app/?src=${encodeURIComponent(activeUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0"
                      title="Open in Web HLS Player"
                    >
                      <Radio className="size-4 text-[#E50914]" />
                    </a>
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0"
                      title="Open in new tab / VLC"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                </div>

                {/* Switch Mode Controls */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs text-gray-400 block font-semibold">Playback Engine:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setPlaybackMode('hls');
                        reloadStream();
                        setActiveSheet('none');
                      }}
                      className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        playbackMode === 'hls' ? 'bg-[#E50914] text-white' : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <Radio className="size-3.5" />
                      <span>HLS.js Engine</span>
                    </button>

                    <button
                      onClick={() => {
                        setPlaybackMode('direct');
                        reloadStream();
                        setActiveSheet('none');
                      }}
                      className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        playbackMode === 'direct' ? 'bg-[#E50914] text-white' : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <Link className="size-3.5" />
                      <span>Direct HTML5 Stream</span>
                    </button>
                  </div>
                </div>

                {/* Custom Direct Link Player */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <label className="text-xs text-gray-300 font-semibold block">Play Any Custom Direct Video Link:</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://.../video.mp4 or .m3u8"
                      value={customLinkInput}
                      onChange={(e) => setCustomLinkInput(e.target.value)}
                      className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#E50914]"
                    />
                    <button
                      onClick={() => {
                        if (customLinkInput.trim()) {
                          setActiveUrl(customLinkInput.trim());
                          setPlaybackMode(customLinkInput.trim().includes('.m3u8') ? 'hls' : 'direct');
                          reloadStream();
                          setActiveSheet('none');
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-[#b81d24] text-white font-bold text-xs transition"
                    >
                      Play
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Speed Sheet */}
            {activeSheet === 'speed' && (
              <SheetSection title="Playback Speed" onClose={() => setActiveSheet('none')}>
                {SPEEDS.map((sp) => (
                  <OptionRow
                    key={sp}
                    label={sp === 1 ? '1x (Normal)' : `${sp}x`}
                    active={speed === sp}
                    onClick={() => changeSpeed(sp)}
                  />
                ))}
              </SheetSection>
            )}

            {/* Quality Sheet */}
            {activeSheet === 'quality' && (
              <SheetSection title="Quality" onClose={() => setActiveSheet('none')}>
                <OptionRow
                  label="Auto (Adaptive 1080p)"
                  active={currentLevel === -1}
                  onClick={() => changeLevel(-1)}
                />
                {qualityLevels.map((q) => (
                  <OptionRow
                    key={q.index}
                    label={`${q.label} Full HD`}
                    active={currentLevel === q.index}
                    onClick={() => changeLevel(q.index)}
                  />
                ))}
              </SheetSection>
            )}

            {/* Episodes Sheet */}
            {activeSheet === 'episodes' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="font-bold text-sm text-white uppercase tracking-wider">
                    Episodes • {episodes.length} Available
                  </h4>
                  <button onClick={() => setActiveSheet('none')} className="text-gray-400 hover:text-white">
                    <X className="size-5" />
                  </button>
                </div>

                <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1 no-scrollbar">
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
            )}

            {/* Audio & Subtitles Sheet */}
            {activeSheet === 'audiosubs' && (
              <div className="grid grid-cols-2 gap-4 pb-2">
                <div>
                  <h4 className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-white/50">Audio</h4>
                  <ul className="space-y-1">
                    <OptionRow label="Japanese [Original]" active={true} onClick={() => {}} />
                  </ul>
                </div>
                <div>
                  <h4 className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-white/50">Subtitles</h4>
                  <ul className="space-y-1">
                    <OptionRow label="English (Burned/VTT)" active={selectedSub === 'en'} onClick={() => setSelectedSub('en')} />
                    <OptionRow label="Off" active={selectedSub === 'off'} onClick={() => setSelectedSub('off')} />
                  </ul>
                </div>
              </div>
            )}

            {/* Download Episode Sheet */}
            {activeSheet === 'download' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="font-bold text-sm text-white">Download Episode</h4>
                  <button onClick={() => setActiveSheet('none')} className="text-gray-400 hover:text-white">
                    <X className="size-5" />
                  </button>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed">
                  Download the master HLS streaming playlist file to play directly in VLC, PotPlayer, MPV, or download as MP4 with yt-dlp.
                </p>

                <div className="space-y-2 pt-2">
                  <a
                    href={activeUrl}
                    download={`${seriesTitle} - ${epTitle}.m3u8`}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#b81d24] text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Download className="size-4" />
                    <span>Download M3U8 Playlist File</span>
                  </a>

                  <button
                    onClick={() => {
                      const cmd = `yt-dlp "${activeUrl}" -o "${seriesTitle} - ${epTitle}.mp4"`;
                      navigator.clipboard.writeText(cmd);
                      alert('Copied yt-dlp command to clipboard!');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition"
                  >
                    <Copy className="size-4" />
                    <span>Copy yt-dlp Command (Download MP4)</span>
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setActiveSheet('none')}
              className="mt-4 w-full border-t border-white/10 pt-3 text-center text-xs font-semibold text-white/70 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// FlowFlix Bar Button Component
function BarButton({
  icon,
  label,
  onClick
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10 active:scale-95"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// FlowFlix Sheet Section Component
function SheetSection({
  title,
  children,
  onClose
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">{title}</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="size-5" />
        </button>
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

// FlowFlix Option Row Component
function OptionRow({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition ${
          active ? 'bg-[#E50914] font-bold text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Check className={`size-4 shrink-0 ${active ? 'opacity-100' : 'opacity-0'}`} />
        <span className="flex-1 truncate">{label}</span>
      </button>
    </li>
  );
}
