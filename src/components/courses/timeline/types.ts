export interface QuizInteraction {
  id: string; type: 'quiz'; atSec: number; question: string; options: string[]; correctIndexes: number[]; explanation?: string;
}
export interface OverlayInteraction {
  id: string; type: 'overlay'; atSec: number; untilSec?: number; title: string; text: string; ctaLabel?: string; ctaHref?: string;
}
export type InteractionItem = QuizInteraction | OverlayInteraction;
export interface VideoClip { cdnVideoId: string; duration: number; interactions: InteractionItem[]; }
export interface ClipItem {
  tempId: string; cdnVideoId: string; duration: number;
  pendingFile?: File; processingStatus?: 'processing' | 'ready' | 'error'; interactions: InteractionItem[];
}
export const uuid = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const newClip = (): ClipItem => ({ tempId: uuid(), cdnVideoId: '', duration: 0, interactions: [] });

export function toVideoClip(clip: ClipItem): VideoClip {
  const interactions: InteractionItem[] = clip.interactions.slice().sort((a, b) => a.atSec - b.atSec).map((it) =>
    it.type === 'quiz'
      ? { id: it.id, type: 'quiz', atSec: it.atSec, question: it.question, options: it.options, correctIndexes: it.correctIndexes, ...(it.explanation ? { explanation: it.explanation } : {}) }
      : { id: it.id, type: 'overlay', atSec: it.atSec, ...(it.untilSec != null ? { untilSec: it.untilSec } : {}), title: it.title, text: it.text, ...(it.ctaLabel ? { ctaLabel: it.ctaLabel } : {}), ...(it.ctaHref ? { ctaHref: it.ctaHref } : {}) });
  return { cdnVideoId: clip.cdnVideoId, duration: clip.duration, interactions };
}
export function fromVideoClip(vc: any): ClipItem {
  return {
    tempId: uuid(), cdnVideoId: vc.cdnVideoId ?? '', duration: vc.duration ?? 0,
    interactions: (vc.interactions ?? []).map((it: any) =>
      it.type === 'overlay'
        ? { id: it.id ?? uuid(), type: 'overlay', atSec: it.atSec ?? 0, untilSec: it.untilSec, title: it.title ?? '', text: it.text ?? '', ctaLabel: it.ctaLabel, ctaHref: it.ctaHref }
        : { id: it.id ?? uuid(), type: 'quiz', atSec: it.atSec ?? 0, question: it.question ?? '', options: Array.isArray(it.options) && it.options.length >= 2 ? it.options : ['', ''], correctIndexes: Array.isArray(it.correctIndexes) && it.correctIndexes.length ? it.correctIndexes : [0], explanation: it.explanation ?? '' }),
  };
}
