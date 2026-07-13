'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  onEnded?: () => void;
  autoPlay?: boolean;
  onTimeUpdate?: (t: number) => void;
  onSeeking?: (t: number) => void;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

export default function VideoPlayer({ src, onEnded, autoPlay = false, onTimeUpdate, onSeeking }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!src || !videoRef.current) return;

    const setupPlayer = async () => {
      const el = videoRef.current;
      if (!el) return;
      // Dynamically import HLS.js to avoid SSR issues
      const Hls = (await import('hls.js')).default;

      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        hls.loadSource(src);
        hls.attachMedia(el);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) el.play().catch(() => {});
        });
        hlsRef.current = hls;
      } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        el.src = src;
        if (autoPlay) el.play().catch(() => {});
      }
    };

    setupPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const seekToClientX = (clientX: number) => {
    const v = videoRef.current;
    const track = trackRef.current;
    if (!v || !track || !duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    // Setting currentTime fires a native `seeking` event, so InteractivePlayer's
    // anti-seek clamp still gates jumps past an unanswered blocking quiz.
    v.currentTime = ratio * duration;
    setCurrent(v.currentTime);
  };

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    trackRef.current?.setPointerCapture(e.pointerId);
    seekToClientX(e.clientX);
  };
  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 1) seekToClientX(e.clientX);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="group relative bg-black overflow-hidden aspect-video w-full"
    >
      <video
        ref={videoRef}
        data-testid="interactive-video"
        className="w-full h-full cursor-pointer"
        playsInline
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onEnded={onEnded}
        onTimeUpdate={(e) => {
          setCurrent(e.currentTarget.currentTime);
          onTimeUpdate?.(e.currentTarget.currentTime);
        }}
        onSeeking={onSeeking ? (e) => onSeeking(e.currentTarget.currentTime) : undefined}
      />

      {/* Poster-style play button when paused — reads as embedded media, not a widget */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Redă"
          className="absolute inset-0 flex items-center justify-center bg-black/10 transition"
        >
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm transition-transform hover:scale-105">
            <Play className="w-7 h-7 ml-1" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Minimal controls — appear only on hover */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-2 pt-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {/* thin seekable progress line */}
        <div
          ref={trackRef}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          className="pointer-events-auto relative h-1 rounded-full bg-white/25 cursor-pointer transition-all hover:h-1.5"
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${pct}%` }} />
        </div>
        <div className="pointer-events-auto mt-2 flex items-center gap-3 text-white text-xs">
          <button type="button" onClick={togglePlay} aria-label={playing ? 'Pauză' : 'Redă'} className="hover:opacity-80 transition">
            {playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
          </button>
          <span className="tabular-nums text-white/90">{fmt(current)} / {fmt(duration)}</span>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Ecran complet"
            className="ml-auto hover:opacity-80 transition"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
