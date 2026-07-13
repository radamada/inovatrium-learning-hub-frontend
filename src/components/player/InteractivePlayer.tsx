'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { InteractionType, QuizInteraction, OverlayInteraction, VideoClip } from '@/types';
import VideoPlayer from './VideoPlayer';
import InVideoQuizCard from './InVideoQuizCard';
import OverlayCard from './OverlayCard';

// Registru extensibil: decide pauză-vs-nu per tip de interacțiune.
export const interactionRegistry: Record<InteractionType, { blocking: boolean }> = {
  quiz: { blocking: true },
  overlay: { blocking: false },
};

interface InteractivePlayerProps {
  clips: VideoClip[];
  courseId: string;
  isFree?: boolean;
  onLessonEnded: () => void;
}

export default function InteractivePlayer({ clips, courseId, isFree = false, onLessonEnded }: InteractivePlayerProps) {
  const safeClips = clips ?? [];
  const containerRef = useRef<HTMLDivElement>(null);
  const prevTimeRef = useRef(0);
  const fetchingRef = useRef<Set<string>>(new Set());

  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [passedInteractions, setPassedInteractions] = useState<Set<string>>(new Set());
  const [activeQuiz, setActiveQuiz] = useState<QuizInteraction | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<OverlayInteraction | null>(null);

  const currentClip = safeClips[currentClipIndex];
  const currentUrl = currentClip ? urls[currentClip.cdnVideoId] ?? '' : '';

  const getVideo = (): HTMLVideoElement | null =>
    (containerRef.current?.querySelector('video') as HTMLVideoElement | null) ?? null;

  const unlockedUntil = useMemo(() => {
    const clip = safeClips[currentClipIndex];
    if (!clip) return Infinity;
    const gates = clip.interactions
      .filter((it): it is QuizInteraction => it.type === 'quiz' && interactionRegistry[it.type].blocking && !passedInteractions.has(it.id))
      .map((it) => it.atSec).sort((a, b) => a - b);
    return gates.length ? gates[0] : Infinity;
  }, [safeClips, currentClipIndex, passedInteractions]);

  const fetchClipUrl = useCallback(async (cdnVideoId: string) => {
    if (!cdnVideoId || urls[cdnVideoId] || fetchingRef.current.has(cdnVideoId)) return;
    fetchingRef.current.add(cdnVideoId);
    try {
      const endpoint = isFree ? `/media/preview-url/${cdnVideoId}` : `/media/play-url/${cdnVideoId}`;
      const { data } = await api.get(endpoint, { params: { courseId } });
      setUrls((prev) => ({ ...prev, [cdnVideoId]: data.url }));
    } catch {
      toast.error('Eroare la încărcarea videoclipului');
    } finally {
      fetchingRef.current.delete(cdnVideoId);
    }
  }, [urls, isFree, courseId]);

  useEffect(() => { if (currentClip) fetchClipUrl(currentClip.cdnVideoId); }, [currentClip, fetchClipUrl]);

  const maybePrefetchNext = (t: number) => {
    const clip = safeClips[currentClipIndex];
    const next = safeClips[currentClipIndex + 1];
    if (clip && next && t > clip.duration - 10) fetchClipUrl(next.cdnVideoId);
  };

  const fireInteractions = (prevT: number, curT: number) => {
    const clip = safeClips[currentClipIndex];
    if (!clip) return;
    const inWindow = clip.interactions
      .filter((it) => !passedInteractions.has(it.id) && it.atSec > prevT && it.atSec <= curT)
      .sort((a, b) => a.atSec - b.atSec);
    for (const it of inWindow) {
      if (interactionRegistry[it.type].blocking) {
        getVideo()?.pause();
        setActiveQuiz(it as QuizInteraction);
        return;
      }
      setActiveOverlay(it as OverlayInteraction);
    }
  };

  const enforceClamp = (v: HTMLVideoElement): boolean => {
    if (v.currentTime > unlockedUntil + 0.25) {
      v.currentTime = unlockedUntil;
      const clip = safeClips[currentClipIndex];
      const quiz = clip?.interactions.find(
        (it): it is QuizInteraction => it.type === 'quiz' && it.atSec === unlockedUntil && !passedInteractions.has(it.id),
      );
      if (quiz) { v.pause(); setActiveQuiz(quiz); }
      return true;
    }
    return false;
  };

  const handleTimeUpdate = (t: number) => {
    const v = getVideo();
    if (v && enforceClamp(v)) { prevTimeRef.current = v.currentTime; return; }
    const prevT = prevTimeRef.current;
    prevTimeRef.current = t;
    // Overlay-ul NU se mai închide automat (nici la untilSec, nici la finalul
    // clipului) — rămâne până la X sau click în afara lui (vezi OverlayCard).
    maybePrefetchNext(t);
    if (!activeQuiz) fireInteractions(prevT, t);
  };

  const handleSeeking = () => { const v = getVideo(); if (v) enforceClamp(v); };

  const handleEnded = () => {
    if (currentClipIndex < safeClips.length - 1) {
      prevTimeRef.current = 0;
      setActiveQuiz(null);
      setActiveOverlay(null);
      setCurrentClipIndex((i) => i + 1);
    } else {
      onLessonEnded();
    }
  };

  const handleQuizPassed = () => {
    if (!activeQuiz) return;
    setPassedInteractions((prev) => new Set(prev).add(activeQuiz.id));
    setActiveQuiz(null);
    getVideo()?.play();
  };
  const handleOverlayDismiss = () => {
    if (activeOverlay) setPassedInteractions((prev) => new Set(prev).add(activeOverlay.id));
    setActiveOverlay(null);
  };

  if (safeClips.length === 0) {
    return (
      <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
        <p className="text-gray-400">Selectează o lecție cu conținut video</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <VideoPlayer
        key={currentClip?.cdnVideoId}
        src={currentUrl}
        autoPlay={currentClipIndex > 0}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onSeeking={handleSeeking}
      />
      {activeOverlay && <OverlayCard interaction={activeOverlay} onDismiss={handleOverlayDismiss} />}
      {activeQuiz && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <InVideoQuizCard interaction={activeQuiz} onPassed={handleQuizPassed} />
        </div>
      )}
    </div>
  );
}
