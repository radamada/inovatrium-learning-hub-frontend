'use client';

import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  src: string;
  onEnded?: () => void;
  autoPlay?: boolean;
}

export default function VideoPlayer({ src, onEnded, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

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
          if (autoPlay) el.play();
        });
        hlsRef.current = hls;
      } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        el.src = src;
        if (autoPlay) el.play();
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

  return (
    <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
        onEnded={onEnded}
      />
    </div>
  );
}
