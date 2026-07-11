'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

const uuid = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : (`${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`).replace(/[018]/g, (c: string) =>
        (Number(c) ^ (Math.random() * 16 >> (Number(c) / 4))).toString(16),
      );
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Upload, ChevronDown, ChevronUp, ChevronRight, GripVertical, Video, Loader2, ImageIcon, AlertTriangle, CheckCircle2, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Category, Section } from '@/types';
import { StringListEditor } from '@/components/ui/StringListEditor';
import { courseSchema, type CourseFormData } from '@/lib/schemas/course.schema';
import TimelineEditor from '@/components/courses/timeline/TimelineEditor';
import { type ClipItem, newClip, toVideoClip, fromVideoClip } from '@/components/courses/timeline/types';

type FormData = CourseFormData;
const schema = courseSchema;

/**
 * Config that distinguishes the admin vs instructor "edit course" flow.
 * Everything outside this object is shared, byte-for-byte, between both pages.
 */
export interface CourseEditEditorConfig {
  /** API namespace base — `/admin` or `/instructor`. */
  apiBase: string;
  /** Redirect / list path after save/publish/discard — `/admin/courses` or `/instructor/courses`. */
  listPath: string;
  /** react-query key for the single course — e.g. `'admin-course'`. */
  courseQueryKey: string;
  /** react-query key for the course curriculum — e.g. `'admin-curriculum'`. */
  curriculumQueryKey: string;
  /** react-query key invalidated on full save/publish — e.g. `['admin-courses']`. */
  coursesQueryKey: readonly unknown[];
  /** Hint text shown under quiz options (differs between admin and instructor). */
  quizCorrectHint: string;
  /**
   * Predicate deciding whether to keep server-loaded quiz options as-is.
   * Admin keeps only when exactly 4 options exist; instructor keeps when ≥ 2.
   * (Preserves the pre-refactor per-page behavior.)
   */
  keepLoadedOptions: (optionsLength: number) => boolean;
}

interface QuizQuestionItem {
  question: string;
  options: string[]; // 4 options
  correctIndexes: number[];
}

interface LessonItem {
  dbId?: string;
  tempId: string;
  title: string;
  type: 'video' | 'quiz';
  // video fields
  cdnVideoId: string;
  duration: number;
  isFree: boolean;
  uploading: boolean;
  pendingFile?: File;           // file selected but not yet uploaded to CDN
  processingStatus?: 'processing' | 'ready' | 'error';
  clips: ClipItem[];            // multi-clip + timeline interactions
  // quiz fields
  questions: QuizQuestionItem[];
  quizExpanded: boolean;
}

interface SectionItem {
  dbId?: string;
  tempId: string;
  title: string;
  lessons: LessonItem[];
  expanded: boolean;
}

const newVideoLesson = (): LessonItem => ({
  tempId: uuid(),
  title: 'Lecție nouă',
  type: 'video',
  cdnVideoId: '',
  duration: 0,
  isFree: false,
  uploading: false,
  clips: [newClip()],
  questions: [],
  quizExpanded: true,
});

const newQuizLesson = (): LessonItem => ({
  tempId: uuid(),
  title: 'Quiz nou',
  type: 'quiz',
  cdnVideoId: '',
  duration: 0,
  isFree: false,
  uploading: false,
  clips: [],
  questions: [{ question: '', options: ['', '', '', ''], correctIndexes: [0] }],
  quizExpanded: true,
});

const newQuestion = (): QuizQuestionItem => ({
  question: '',
  options: ['', '', '', ''],
  correctIndexes: [0],
});

function sectionsKey(sects: SectionItem[]): string {
  return JSON.stringify(sects.map((s) => ({
    dbId: s.dbId,
    title: s.title,
    lessons: s.lessons.map((l) => ({
      dbId: l.dbId, title: l.title, type: l.type,
      isFree: l.isFree, questions: l.questions,
      clips: l.clips.map((c) => ({
        cdnVideoId: c.cdnVideoId, duration: c.duration,
        interactions: c.interactions, hasPending: !!c.pendingFile,
      })),
    })),
  })));
}

export default function CourseEditEditor({ id, config }: { id: string; config: CourseEditEditorConfig }) {
  const { apiBase, listPath, courseQueryKey, curriculumQueryKey, coursesQueryKey, quizCorrectHint, keepLoadedOptions } = config;
  const router = useRouter();
  const qc = useQueryClient();

  const [sections, setSections] = useState<SectionItem[]>([]);
  const initialSectionsRef = useRef<string>('');
  const [step, setStep] = useState<'info' | 'curriculum'>('info');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [deletingThumb, setDeletingThumb] = useState(false);
  const [thumbnailError, setThumbnailError] = useState('');
  const [savingCurriculum, setSavingCurriculum] = useState(false);
  const [publishingChanges, setPublishingChanges] = useState(false);
  const [discardingChanges, setDiscardingChanges] = useState(false);
  const [curriculumInitialized, setCurriculumInitialized] = useState(false);
  const [whatYouLearn, setWhatYouLearn] = useState<string[]>([]);
  const pollingVideos = useRef<Set<string>>(new Set());
  const pollingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingDelay = useRef<number>(5_000);
  const isMounted = useRef(true);
  const [wylError, setWylError] = useState('');

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: [courseQueryKey, id],
    queryFn: () => api.get(`${apiBase}/courses/${id}`).then((r) => r.data),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { data: curriculum } = useQuery<Section[]>({
    queryKey: [curriculumQueryKey, id],
    enabled: !!id,
    queryFn: () => api.get(`${apiBase}/courses/${id}/curriculum`).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });
  const watchedLevel = watch('level');
  const watchedCategoryId = watch('categoryId');

  useEffect(() => {
    if (!course) return;
    const p = course.pendingChanges ?? {};
    const thumbnail = p.thumbnail ?? course.thumbnail ?? '';
    if (!thumbnailUrl) setThumbnailUrl(thumbnail);
    const level = p.level ?? course.level ?? '';
    const categoryId = p.categoryId
      ? (typeof p.categoryId === 'object' ? p.categoryId._id ?? p.categoryId.toString() : p.categoryId)
      : (course.categoryId?._id ?? '');
    reset({
      title: p.title ?? course.title,
      description: p.description ?? course.description,
      price: ((p.price ?? course.price) as number)?.toFixed(2) as never,
      categoryId,
      level,
      language: p.language ?? course.language ?? 'ro',
    });
    if (level) setValue('level', level);
    if (categoryId) setValue('categoryId', categoryId);
    const wyl = p.whatYouLearn ?? course.whatYouLearn ?? [];
    setWhatYouLearn(wyl);
  }, [course, reset]);

  const mapLessonFromApi = (l: any): LessonItem => ({
    dbId: l._id ?? l.lessonId ?? undefined,
    tempId: l._id ?? l.lessonId ?? uuid(),
    title: l.title,
    type: l.type ?? 'video',
    cdnVideoId: l.cdnVideoId ?? '',
    duration: l.duration ?? 0,
    isFree: l.isFree ?? false,
    uploading: false,
    clips: Array.isArray(l.clips) && l.clips.length
      ? l.clips.map(fromVideoClip)
      : l.type !== 'quiz' && l.cdnVideoId
        ? [{ tempId: uuid(), cdnVideoId: l.cdnVideoId, duration: l.duration ?? 0, interactions: [] }]
        : l.type !== 'quiz'
          ? [newClip()]
          : [],
    questions: (l.questions ?? []).map((q: any) => ({
      question: q.question ?? '',
      options: keepLoadedOptions(q.options?.length ?? 0) ? q.options : ['', '', '', ''],
      correctIndexes: q.correctIndexes ?? (q.correctIndex != null ? [q.correctIndex] : [0]),
    })),
    quizExpanded: false,
  });

  useEffect(() => {
    if (!course) return;

    if (!curriculumInitialized && curriculum) {
      const pendingCurr = course.pendingChanges?.curriculum;
      const pendingValid = Array.isArray(pendingCurr) &&
        pendingCurr.length > 0 &&
        pendingCurr.every((s: any) => Array.isArray(s.lessons));

      let newSections: SectionItem[];
      if (pendingValid) {
        newSections = pendingCurr.map((s: any) => ({
          dbId: s.sectionId ?? undefined,
          tempId: s.sectionId ?? uuid(),
          title: s.title,
          expanded: true,
          lessons: s.lessons.map(mapLessonFromApi),
        }));
      } else {
        newSections = curriculum.map((s) => ({
          dbId: s._id,
          tempId: s._id,
          title: s.title,
          expanded: true,
          lessons: (s.lessons ?? []).map(mapLessonFromApi),
        }));
      }
      setSections(newSections);
      initialSectionsRef.current = sectionsKey(newSections);
      setCurriculumInitialized(true);
    }
  }, [course, curriculum]);

  useEffect(() => {
    // Reset on (re)mount — StrictMode dev mount/unmount/remount otherwise
    // leaves this false and kills polling.
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (pollingTimeout.current) clearTimeout(pollingTimeout.current);
    };
  }, []);

  const scheduleNextPoll = () => {
    pollingTimeout.current = setTimeout(async () => {
      if (!isMounted.current) return;
      const ids = [...pollingVideos.current];
      for (const vid of ids) {
        try {
          const { data } = await api.get<{ status: number }>(`/media/video-status/${vid}`);
          if (!isMounted.current) return;
          if (data.status === 4) {
            pollingVideos.current.delete(vid);
            setSections((prev) => prev.map((s) => ({
              ...s,
              lessons: s.lessons.map((l) => {
                const nl = l.cdnVideoId === vid ? { ...l, processingStatus: 'ready' as const } : l;
                return { ...nl, clips: nl.clips.map((c) => c.cdnVideoId === vid ? { ...c, processingStatus: 'ready' as const } : c) };
              }),
            })));
          } else if (data.status === 5 || data.status === 6) {
            pollingVideos.current.delete(vid);
            setSections((prev) => prev.map((s) => ({
              ...s,
              lessons: s.lessons.map((l) => {
                const nl = l.cdnVideoId === vid ? { ...l, processingStatus: 'error' as const } : l;
                return { ...nl, clips: nl.clips.map((c) => c.cdnVideoId === vid ? { ...c, processingStatus: 'error' as const } : c) };
              }),
            })));
            toast.error('Eroare la procesarea videoclipului pe CDN');
          }
        } catch { /* ignore network errors, retry at next interval */ }
      }
      if (pollingVideos.current.size > 0) {
        pollingDelay.current = Math.min(pollingDelay.current * 2, 30_000);
        scheduleNextPoll();
      } else {
        pollingTimeout.current = null;
      }
    }, pollingDelay.current);
  };

  const startPolling = (videoId: string) => {
    pollingVideos.current.add(videoId);
    // Immediate first check — don't wait 5s. Handles the case where a video is
    // already finished on Bunny but the UI state has stale `processing`.
    (async () => {
      try {
        const { data } = await api.get<{ status: number }>(`/media/video-status/${videoId}`);
        if (!isMounted.current) return;
        if (data.status === 4) {
          pollingVideos.current.delete(videoId);
          setSections((prev) => prev.map((s) => ({
            ...s,
            lessons: s.lessons.map((l) => {
              const nl = l.cdnVideoId === videoId ? { ...l, processingStatus: 'ready' as const } : l;
              return { ...nl, clips: nl.clips.map((c) => c.cdnVideoId === videoId ? { ...c, processingStatus: 'ready' as const } : c) };
            }),
          })));
          return;
        }
        if (data.status === 5 || data.status === 6) {
          pollingVideos.current.delete(videoId);
          setSections((prev) => prev.map((s) => ({
            ...s,
            lessons: s.lessons.map((l) => {
              const nl = l.cdnVideoId === videoId ? { ...l, processingStatus: 'error' as const } : l;
              return { ...nl, clips: nl.clips.map((c) => c.cdnVideoId === videoId ? { ...c, processingStatus: 'error' as const } : c) };
            }),
          })));
          return;
        }
      } catch { /* fall through to scheduled polling */ }
      if (pollingTimeout.current) return;
      pollingDelay.current = 5_000;
      scheduleNextPoll();
    })();
    if (pollingTimeout.current) {
      clearTimeout(pollingTimeout.current);
      pollingTimeout.current = null;
      pollingDelay.current = 5_000;
      scheduleNextPoll();
    }
  };

  // Adopt any processing lessons that aren't already being polled.
  // Covers: curriculum loaded from server with videos still encoding, and page
  // reload/HMR that preserved `sections` but cleared the polling ref.
  useEffect(() => {
    for (const s of sections) {
      for (const l of s.lessons) {
        if (l.processingStatus === 'processing' && l.cdnVideoId && !pollingVideos.current.has(l.cdnVideoId)) {
          startPolling(l.cdnVideoId);
        }
        for (const c of l.clips) {
          if (c.processingStatus === 'processing' && c.cdnVideoId && !pollingVideos.current.has(c.cdnVideoId)) {
            startPolling(c.cdnVideoId);
          }
        }
      }
    }
  }, [sections]);

  // On initial load, reconcile each lesson's CDN status from Bunny so the UI
  // never shows a stale "processing" state (or a fake "ready" when encoding is
  // still running).
  const cdnSyncDone = useRef(false);
  useEffect(() => {
    if (!curriculumInitialized || cdnSyncDone.current) return;
    cdnSyncDone.current = true;
    const videoIds = Array.from(new Set(
      sections.flatMap((s) => s.lessons).flatMap((l) => [
        ...(l.cdnVideoId ? [l.cdnVideoId] : []),
        ...l.clips.filter((c) => c.cdnVideoId).map((c) => c.cdnVideoId),
      ]),
    ));
    if (videoIds.length === 0) return;
    (async () => {
      const entries = await Promise.all(
        videoIds.map(async (vid) => {
          try {
            const { data } = await api.get<{ status: number }>(`/media/video-status/${vid}`);
            return [vid, data.status] as const;
          } catch {
            return [vid, null] as const;
          }
        }),
      );
      const statusMap = new Map(entries);
      const resolveStatus = (vid: string): 'processing' | 'error' | undefined => {
        const st = statusMap.get(vid);
        if (st === 5 || st === 6) return 'error';
        if (st === 4) return undefined;
        return 'processing';
      };
      setSections((prev) => prev.map((s) => ({
        ...s,
        lessons: s.lessons.map((l) => {
          let nl = l;
          if (l.cdnVideoId && statusMap.get(l.cdnVideoId) != null) {
            nl = { ...nl, processingStatus: resolveStatus(l.cdnVideoId) };
          }
          const clips = nl.clips.map((c) => {
            if (!c.cdnVideoId || statusMap.get(c.cdnVideoId) == null) return c;
            return { ...c, processingStatus: resolveStatus(c.cdnVideoId) };
          });
          return { ...nl, clips };
        }),
      })));
    })();
  }, [curriculumInitialized, sections]);

  const uploadThumbnail = async (file: File) => {
    setUploadingThumb(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/media/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setThumbnailUrl(data.url);
      setThumbnailError('');
      toast.success('Thumbnail încărcat!');
    } catch {
      toast.error('Eroare la încărcarea thumbnail-ului');
    } finally {
      setUploadingThumb(false);
    }
  };

  const publishPendingChanges = async () => {
    setPublishingChanges(true);
    try {
      // Always save current curriculum state before publishing
      const pendingCurriculum = sections.map((s) => ({
        sectionId: s.dbId ?? null,
        title: s.title,
        lessons: s.lessons.map((l) => ({
          lessonId: l.dbId ?? null,
          title: l.title,
          type: l.type,
          cdnVideoId: l.type === 'video' ? (l.clips[0]?.cdnVideoId ?? '') : '',
          duration: l.type === 'video' ? (l.clips[0]?.duration ?? 0) : 0,
          isFree: l.type === 'video' ? l.isFree : false,
          clips: l.type === 'video' ? l.clips.map(toVideoClip) : [],
          questions: l.type === 'quiz' ? l.questions : [],
        })),
      }));
      if (pendingCurriculum.length > 0) {
        await api.put(`${apiBase}/courses/${id}/pending-curriculum`, { curriculum: pendingCurriculum });
      }
      await api.patch(`${apiBase}/courses/${id}/publish-changes`);
      qc.invalidateQueries({ queryKey: [courseQueryKey, id] });
      qc.invalidateQueries({ queryKey: [curriculumQueryKey, id] });
      toast.success('Modificările au fost publicate!');
      router.push(listPath);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la publicare');
    } finally {
      setPublishingChanges(false);
    }
  };

  const discardPendingChanges = async () => {
    setDiscardingChanges(true);
    try {
      // Send all CDN video IDs currently visible on the page so backend can
      // clean up any that aren't part of the published curriculum yet
      const pageVideoIds = Array.from(new Set(
        sections.flatMap((s) => s.lessons).flatMap((l) => [
          ...(l.cdnVideoId ? [l.cdnVideoId] : []),
          ...l.clips.filter((c) => c.cdnVideoId).map((c) => c.cdnVideoId),
        ]),
      ));
      await api.delete(`${apiBase}/courses/${id}/pending-changes`, { data: { videoIds: pageVideoIds } });
      qc.invalidateQueries({ queryKey: [courseQueryKey, id] });
      toast.success('Modificările au fost anulate.');
      router.push(listPath);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare');
    } finally {
      setDiscardingChanges(false);
    }
  };

  const onSubmitInfo = async (data: FormData) => {
    if (!thumbnailUrl) {
      setThumbnailError('Thumbnail-ul este obligatoriu');
      return;
    }
    setThumbnailError('');
    if (!whatYouLearn.some(Boolean)) {
      setWylError('Adaugă cel puțin un obiectiv de învățare');
      return;
    }
    setWylError('');
    try {
      await api.patch(`${apiBase}/courses/${id}`, {
        ...data,
        thumbnail: thumbnailUrl || undefined,
        whatYouLearn: whatYouLearn.filter(Boolean),
      });
      setStep('curriculum');
      qc.invalidateQueries({ queryKey: [courseQueryKey, id] });
      toast.success(course?.published ? 'Modificări salvate (în așteptare)!' : 'Informații actualizate!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la actualizare');
    }
  };

  // ── Section helpers ──────────────────────────────────────────────────────

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { tempId: uuid(), title: 'Secțiune nouă', lessons: [], expanded: true },
    ]);
  };

  const updateSectionTitle = (tempId: string, title: string) => {
    setSections((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, title } : s)));
  };

  const removeSection = async (tempId: string, dbId?: string) => {
    if (dbId && !course?.published) {
      try {
        await api.delete(`${apiBase}/sections/${dbId}`);
      } catch {
        toast.error('Eroare la ștergerea secțiunii');
        return;
      }
    }
    setSections((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const toggleSection = (tempId: string) => {
    setSections((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, expanded: !s.expanded } : s)));
  };

  // ── Lesson helpers ────────────────────────────────────────────────────────

  const addLesson = (sectionTempId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? { ...s, lessons: [...s.lessons, newVideoLesson()] }
          : s,
      ),
    );
  };

  const addQuiz = (sectionTempId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? { ...s, lessons: [...s.lessons, newQuizLesson()] }
          : s,
      ),
    );
  };

  const updateLesson = (sectionTempId: string, lessonTempId: string, updates: Partial<LessonItem>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? { ...s, lessons: s.lessons.map((l) => (l.tempId === lessonTempId ? { ...l, ...updates } : l)) }
          : s,
      ),
    );
  };

  // ── Clip helpers ──────────────────────────────────────────────────────────

  const mapLessonClips = (sectionTempId: string, lessonTempId: string, fn: (clips: ClipItem[]) => ClipItem[]) => {
    setSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? { ...s, lessons: s.lessons.map((l) => (l.tempId === lessonTempId ? { ...l, clips: fn(l.clips) } : l)) }
          : s,
      ),
    );
  };

  const updateClip = (sectionTempId: string, lessonTempId: string, clip: ClipItem) => {
    mapLessonClips(sectionTempId, lessonTempId, (clips) =>
      clips.map((c) => (c.tempId === clip.tempId ? clip : c)),
    );
  };

  const addClip = (sectionTempId: string, lessonTempId: string) => {
    mapLessonClips(sectionTempId, lessonTempId, (clips) => [...clips, newClip()]);
  };

  const removeClip = (sectionTempId: string, lessonTempId: string, clipTempId: string) => {
    const clip = sections
      .flatMap((s) => s.lessons)
      .flatMap((l) => l.clips)
      .find((c) => c.tempId === clipTempId);
    if (clip?.cdnVideoId) {
      api.delete(`/media/video/${clip.cdnVideoId}`).catch(() => null);
      pollingVideos.current.delete(clip.cdnVideoId);
    }
    mapLessonClips(sectionTempId, lessonTempId, (clips) => clips.filter((c) => c.tempId !== clipTempId));
  };

  const moveClip = (sectionTempId: string, lessonTempId: string, clipTempId: string, dir: -1 | 1) => {
    mapLessonClips(sectionTempId, lessonTempId, (clips) => {
      const idx = clips.findIndex((c) => c.tempId === clipTempId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= clips.length) return clips;
      const next = [...clips];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const removeLesson = async (sectionTempId: string, lessonTempId: string, dbId?: string) => {
    if (dbId && !course?.published) {
      try {
        await api.delete(`${apiBase}/lessons/${dbId}`);
      } catch {
        toast.error('Eroare la ștergerea lecției');
        return;
      }
    }
    // New lesson (no dbId) with uploaded video(s) — clean up CDN immediately
    if (!dbId) {
      const lesson = sections.flatMap((s) => s.lessons).find((l) => l.tempId === lessonTempId);
      const vids = new Set<string>();
      if (lesson?.cdnVideoId) vids.add(lesson.cdnVideoId);
      for (const c of lesson?.clips ?? []) if (c.cdnVideoId) vids.add(c.cdnVideoId);
      for (const vid of vids) {
        api.delete(`/media/video/${vid}`).catch(() => null);
        pollingVideos.current.delete(vid);
      }
    }

    const newSections = sections.map((s) =>
      s.tempId === sectionTempId
        ? { ...s, lessons: s.lessons.filter((l) => l.tempId !== lessonTempId) }
        : s,
    );

    // If the result matches the published curriculum, auto-clear pending changes
    if (course?.published && curriculum) {
      const publishedKey = sectionsKey(
        curriculum.map((s) => ({
          dbId: s._id, tempId: s._id, title: s.title, expanded: true,
          lessons: s.lessons.map(mapLessonFromApi),
        })),
      );
      if (sectionsKey(newSections) === publishedKey) {
        initialSectionsRef.current = publishedKey;
        api.delete(`${apiBase}/courses/${id}/pending-changes`, { data: { videoIds: [] } })
          .then(() => qc.invalidateQueries({ queryKey: [courseQueryKey, id] }))
          .catch(() => null);
      }
    }

    setSections(newSections);
  };

  const uploadClipVideo = async (sectionTempId: string, lessonTempId: string, clip: ClipItem, file: File) => {
    // Extract duration locally — no CDN upload yet, that happens at Save
    const duration = await new Promise<number>((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(video.duration) || 0); };
      video.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
      video.src = url;
    });
    updateClip(sectionTempId, lessonTempId, { ...clip, pendingFile: file, duration, cdnVideoId: '', processingStatus: undefined });
  };

  // ── Quiz question helpers ────────────────────────────────────────────────

  const addQuestion = (sectionTempId: string, lessonTempId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.tempId === lessonTempId
                  ? { ...l, questions: [...l.questions, newQuestion()] }
                  : l,
              ),
            }
          : s,
      ),
    );
  };

  const removeQuestion = (sectionTempId: string, lessonTempId: string, qIdx: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.tempId === lessonTempId
                  ? { ...l, questions: l.questions.filter((_, i) => i !== qIdx) }
                  : l,
              ),
            }
          : s,
      ),
    );
  };

  const updateQuestion = (
    sectionTempId: string,
    lessonTempId: string,
    qIdx: number,
    updates: Partial<QuizQuestionItem>,
  ) => {
    setSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.tempId === lessonTempId
                  ? {
                      ...l,
                      questions: l.questions.map((q, i) =>
                        i === qIdx ? { ...q, ...updates } : q,
                      ),
                    }
                  : l,
              ),
            }
          : s,
      ),
    );
  };

  const updateOption = (
    sectionTempId: string,
    lessonTempId: string,
    qIdx: number,
    oIdx: number,
    value: string,
  ) => {
    setSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.tempId === lessonTempId
                  ? {
                      ...l,
                      questions: l.questions.map((q, i) => {
                        if (i !== qIdx) return q;
                        const newOptions = [...q.options];
                        newOptions[oIdx] = value;
                        return { ...q, options: newOptions };
                      }),
                    }
                  : l,
              ),
            }
          : s,
      ),
    );
  };

  // ── Save curriculum ────────────────────────────────────────────────────────

  const saveCurriculum = async (publish: boolean) => {
    if (savingCurriculum) return;
    setSavingCurriculum(true);
    try {
      // ── Step 1: Upload pending clip video files to CDN ─────────────────
      const pendingClips = sections
        .flatMap((s) => s.lessons)
        .filter((l) => l.type === 'video')
        .flatMap((l) => l.clips.filter((c) => c.pendingFile).map((c) => ({ lessonTitle: l.title, clip: c })));
      const uploadedMap = new Map<string, string>(); // clip.tempId → cdnVideoId

      if (pendingClips.length > 0) {
        const results = await Promise.allSettled(
          pendingClips.map(async ({ lessonTitle, clip }) => {
            const formData = new FormData();
            formData.append('file', clip.pendingFile!);
            formData.append('title', lessonTitle);
            const { data } = await api.post('/media/upload-video', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            return { tempId: clip.tempId, videoId: data.videoId as string };
          }),
        );

        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) {
          // Clean up any successfully uploaded videos before aborting
          for (const r of results) {
            if (r.status === 'fulfilled') api.delete(`/media/video/${r.value.videoId}`).catch(() => null);
          }
          toast.error('Eroare la încărcarea videoclipurilor. Încearcă din nou.');
          return;
        }

        for (const r of results) {
          if (r.status === 'fulfilled') uploadedMap.set(r.value.tempId, r.value.videoId);
        }

        // Update state
        setSections((prev) => prev.map((s) => ({
          ...s,
          lessons: s.lessons.map((l) => ({
            ...l,
            clips: l.clips.map((c) => {
              const videoId = uploadedMap.get(c.tempId);
              return videoId ? { ...c, cdnVideoId: videoId, pendingFile: undefined, processingStatus: 'processing' as const } : c;
            }),
          })),
        })));

        // Start polling OUTSIDE the state updater (side effects in updaters are unreliable in React 19)
        for (const videoId of uploadedMap.values()) {
          startPolling(videoId);
        }
      }

      // Build sections with resolved clip cdnVideoIds for API calls
      const resolvedSections = sections.map((s) => ({
        ...s,
        lessons: s.lessons.map((l) => ({
          ...l,
          clips: l.clips.map((c) => ({ ...c, cdnVideoId: uploadedMap.get(c.tempId) ?? c.cdnVideoId })),
        })),
      }));
      // ──────────────────────────────────────────────────────────────────

      if (course?.published) {
        const pendingCurriculum = resolvedSections.map((s) => ({
          sectionId: s.dbId ?? null,
          title: s.title,
          lessons: s.lessons.map((l) => ({
            lessonId: l.dbId ?? null,
            title: l.title,
            type: l.type,
            cdnVideoId: l.type === 'video' ? (l.clips[0]?.cdnVideoId ?? '') : '',
            duration: l.type === 'video' ? (l.clips[0]?.duration ?? 0) : 0,
            isFree: l.type === 'video' ? l.isFree : false,
            clips: l.type === 'video' ? l.clips.map(toVideoClip) : [],
            questions: l.type === 'quiz' ? l.questions : [],
          })),
        }));
        await api.put(`${apiBase}/courses/${id}/pending-curriculum`, { curriculum: pendingCurriculum });
        initialSectionsRef.current = sectionsKey(resolvedSections);
        qc.invalidateQueries({ queryKey: [courseQueryKey, id] });
        toast.success('Curriculum salvat ca modificări în așteptare!');
      } else {
        for (const section of resolvedSections) {
          let sectionDbId = section.dbId;

          if (!sectionDbId) {
            const res = await api.post(`${apiBase}/courses/${id}/sections`, { title: section.title });
            sectionDbId = res.data._id;
          } else {
            await api.patch(`${apiBase}/sections/${sectionDbId}`, { title: section.title });
          }

          for (const lesson of section.lessons) {
            if (lesson.type === 'quiz') {
              if (!lesson.dbId) {
                await api.post(
                  `${apiBase}/courses/${id}/sections/${sectionDbId}/quizzes`,
                  { title: lesson.title, questions: lesson.questions },
                );
              } else {
                await api.patch(
                  `${apiBase}/courses/${id}/quizzes/${lesson.dbId}`,
                  { title: lesson.title, questions: lesson.questions },
                );
              }
            } else {
              if (!lesson.dbId) {
                await api.post(
                  `${apiBase}/sections/${sectionDbId}/lessons`,
                  {
                    title: lesson.title,
                    cdnVideoId: lesson.clips[0]?.cdnVideoId ?? '',
                    duration: lesson.clips[0]?.duration ?? 0,
                    clips: lesson.clips.map(toVideoClip),
                    isFree: lesson.isFree,
                  },
                  { params: { courseId: id } },
                );
              } else {
                await api.patch(`${apiBase}/lessons/${lesson.dbId}`, {
                  title: lesson.title,
                  cdnVideoId: lesson.clips[0]?.cdnVideoId ?? '',
                  duration: lesson.clips[0]?.duration ?? 0,
                  clips: lesson.clips.map(toVideoClip),
                  isFree: lesson.isFree,
                });
              }
            }
          }
        }

        if (publish) {
          await api.patch(`${apiBase}/courses/${id}/publish`);
        }

        initialSectionsRef.current = sectionsKey(resolvedSections);
        qc.invalidateQueries({ queryKey: coursesQueryKey });
        qc.invalidateQueries({ queryKey: [curriculumQueryKey, id] });
        toast.success(publish ? 'Curs publicat!' : 'Curriculum salvat!');
        router.push(listPath);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la salvare');
    } finally {
      setSavingCurriculum(false);
    }
  };

  const curriculumDirty = curriculumInitialized && sectionsKey(sections) !== initialSectionsRef.current;
  const hasVideoWithoutCdn = sections.some((s) => s.lessons.some((l) =>
    l.type === 'video' && l.clips.some((c) => !c.cdnVideoId && !c.pendingFile)));
  const hasProcessingVideo = sections.some((s) => s.lessons.some((l) =>
    l.processingStatus === 'processing' || l.clips.some((c) => c.processingStatus === 'processing')));
  const canSaveCurriculum = (curriculumDirty || isDirty) && !hasVideoWithoutCdn && !hasProcessingVideo && !savingCurriculum;

  if (courseLoading) {
    return <div className="text-gray-400 p-8">Se încarcă...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Editare curs</h1>

      {/* Pending changes banner */}
      {course?.pendingChanges && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Modificări în așteptare</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Ai salvat modificări care nu au fost publicate încă. Cursul publicat afișat studenților este nemodificat.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              disabled={discardingChanges || publishingChanges}
              onClick={discardPendingChanges}
              className="border-amber-400 text-amber-700 hover:bg-amber-100"
            >
              {discardingChanges ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Renunță la toate modificările
            </Button>
            <Button
              size="sm"
              disabled={publishingChanges || discardingChanges || hasProcessingVideo}
              onClick={publishPendingChanges}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              title={hasProcessingVideo ? 'Așteptați finalizarea procesării videoclipurilor' : undefined}
            >
              {publishingChanges ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
              Publică modificările
            </Button>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        {(['info', 'curriculum'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                step === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
            <span className={`text-sm font-medium ${step === s ? 'text-blue-600' : 'text-gray-500'}`}>
              {s === 'info' ? 'Informații' : 'Curriculum'}
            </span>
            {i === 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        ))}
      </div>

      {/* Step 1: Course info */}
      {step === 'info' && (
        <form onSubmit={handleSubmit(onSubmitInfo)} className="bg-white rounded-xl border p-6 space-y-5 max-w-2xl">
          <div>
            <Label>Titlu curs *</Label>
            <Input placeholder="ex: Leadership Participativ" {...register('title')} className="mt-1" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label>Descriere *</Label>
            <Textarea
              placeholder="Descrie ce vor învăța studenții..."
              rows={4}
              {...register('description')}
              className="mt-1"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <StringListEditor
            label="Ce vei învăța"
            placeholder="ex: Vei înțelege principiile de bază ale..."
            items={whatYouLearn}
            onChange={(v) => { setWhatYouLearn(v); if (v.some(Boolean)) setWylError(''); }}
            maxItems={10}
            error={wylError}
          />

          <div>
            <Label>Thumbnail *</Label>
            <div className="mt-1 flex items-start gap-4">
              {thumbnailUrl ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <Image src={thumbnailUrl} alt="Thumbnail" fill sizes="128px" className="object-cover" />
                  <button
                    type="button"
                    disabled={deletingThumb}
                    onClick={async () => {
                      setDeletingThumb(true);
                      try {
                        await api.delete(`/media/image?url=${encodeURIComponent(thumbnailUrl)}`);
                        setThumbnailUrl('');
                      } catch {
                        toast.error('Eroare la ștergerea thumbnail-ului');
                      } finally {
                        setDeletingThumb(false);
                      }
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                  >
                    {deletingThumb ? <Loader2 className="w-3 h-3 animate-spin" /> : '×'}
                  </button>
                </div>
              ) : (
                <label className={`cursor-pointer w-32 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50 transition ${uploadingThumb ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploadingThumb ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-xs text-gray-500">Încarcă imagine</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadThumbnail(file);
                    }}
                  />
                </label>
              )}
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP. Max 5MB.<br />Recomandat: 1280×720px</p>
            </div>
            {thumbnailError && <p className="text-red-500 text-xs mt-1">{thumbnailError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preț (lei) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="ex: 99.00 (30–2000 lei)"
                {...register('price', {
                  onBlur: (e) => {
                    const raw = String(e.target.value).replace(',', '.').trim();
                    if (!raw) return;
                    const n = parseFloat(raw);
                    if (Number.isFinite(n)) {
                      const rounded = Math.round(n * 100) / 100;
                      setValue('price', rounded as never, { shouldValidate: true, shouldDirty: true });
                      e.target.value = rounded.toFixed(2);
                    }
                  },
                })}
                className="mt-1"
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <Label>Nivel *</Label>
              <Select value={watchedLevel ?? ''} onValueChange={(v) => setValue('level', v ?? '')}>
                <SelectTrigger className="mt-1">
                  <span>
                    {watchedLevel === 'beginner' ? 'Începător'
                      : watchedLevel === 'intermediate' ? 'Intermediar'
                      : watchedLevel === 'advanced' ? 'Avansat'
                      : 'Selectează nivel'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Începător</SelectItem>
                  <SelectItem value="intermediate">Intermediar</SelectItem>
                  <SelectItem value="advanced">Avansat</SelectItem>
                </SelectContent>
              </Select>
              {errors.level && <p className="text-red-500 text-xs mt-1">{String(errors.level.message)}</p>}
            </div>
          </div>

          <div>
            <Label>Categorie *</Label>
            <Select value={watchedCategoryId ?? ''} onValueChange={(v) => setValue('categoryId', v ?? '')}>
              <SelectTrigger className="mt-1">
                <span>
                  {categories?.find((c) => c._id === watchedCategoryId)?.name ?? 'Selectează categorie'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Se salvează...' : 'Salvează și continuă →'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep('curriculum')}>
                Sari la Curriculum
              </Button>
            </div>
            <Button type="button" variant="outline" onClick={() => router.push(listPath)} className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40">
              Renunță la editare
            </Button>
          </div>
        </form>
      )}

      {/* Step 2: Curriculum */}
      {step === 'curriculum' && (
        <div className="space-y-4 max-w-3xl">
          {sections.map((section, sectionIdx) => (
            <div key={section.tempId} className="bg-white rounded-xl border overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <input
                  value={section.title}
                  onChange={(e) => updateSectionTitle(section.tempId, e.target.value)}
                  className="flex-1 bg-transparent font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1"
                />
                <button onClick={() => toggleSection(section.tempId)} className="text-gray-400 hover:text-gray-600">
                  {section.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <button onClick={() => removeSection(section.tempId, section.dbId)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {section.expanded && (
                <div className="divide-y">
                  {section.lessons.map((lesson, lessonIdx) => (
                    <div key={lesson.tempId} className="p-4 pl-8">
                      {lesson.type === 'quiz' ? (
                        /* ── Quiz item ── */
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <ClipboardList className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <input
                              value={lesson.title}
                              onChange={(e) => updateLesson(section.tempId, lesson.tempId, { title: e.target.value })}
                              className="flex-1 text-sm border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-400 bg-transparent"
                              placeholder="Titlu quiz"
                            />
                            <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">Quiz</Badge>
                            <button
                              onClick={() => updateLesson(section.tempId, lesson.tempId, { quizExpanded: !lesson.quizExpanded })}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {lesson.quizExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <button onClick={() => removeLesson(section.tempId, lesson.tempId, lesson.dbId)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {lesson.quizExpanded && (
                            <div className="pl-7 space-y-4 mt-1">
                              {lesson.questions.map((q, qIdx) => (
                                <div key={qIdx} className="bg-gray-50 rounded-lg border p-3 space-y-2">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-bold text-blue-600 mt-1 w-5 flex-shrink-0">{qIdx + 1}.</span>
                                    <input
                                      value={q.question}
                                      onChange={(e) => updateQuestion(section.tempId, lesson.tempId, qIdx, { question: e.target.value })}
                                      className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400 bg-white"
                                      placeholder="Scrie întrebarea..."
                                    />
                                    <button
                                      onClick={() => removeQuestion(section.tempId, lesson.tempId, qIdx)}
                                      className="text-red-400 hover:text-red-600 mt-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="space-y-1.5 pl-7">
                                    {q.options.map((opt, oIdx) => (
                                      <div key={oIdx} className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={q.correctIndexes.includes(oIdx)}
                                          onChange={() => {
                                            const has = q.correctIndexes.includes(oIdx);
                                            const next = has
                                              ? q.correctIndexes.filter((i) => i !== oIdx)
                                              : [...q.correctIndexes, oIdx];
                                            if (next.length === 0) return; // must have at least one correct
                                            updateQuestion(section.tempId, lesson.tempId, qIdx, { correctIndexes: next });
                                          }}
                                          className="accent-blue-600"
                                          title="Răspuns corect"
                                        />
                                        <span className="text-xs text-gray-500 w-4 flex-shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                                        <input
                                          value={opt}
                                          onChange={(e) => updateOption(section.tempId, lesson.tempId, qIdx, oIdx, e.target.value)}
                                          className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400 bg-white"
                                          placeholder={`Opțiunea ${String.fromCharCode(65 + oIdx)}`}
                                        />
                                      </div>
                                    ))}
                                    <p className="text-xs text-gray-400 mt-1">{quizCorrectHint}</p>
                                  </div>
                                </div>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addQuestion(section.tempId, lesson.tempId)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" /> Adaugă întrebare
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* ── Video lesson item ── */
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <input
                              value={lesson.title}
                              onChange={(e) => updateLesson(section.tempId, lesson.tempId, { title: e.target.value })}
                              className="flex-1 text-sm border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-400 bg-transparent"
                              placeholder="Titlu lecție"
                            />
                            {sectionIdx === 0 && lessonIdx === 0 && (
                              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={lesson.isFree}
                                  onChange={(e) => updateLesson(section.tempId, lesson.tempId, { isFree: e.target.checked })}
                                />
                                Previzualizare gratuită
                              </label>
                            )}
                            <button onClick={() => removeLesson(section.tempId, lesson.tempId, lesson.dbId)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="pl-7 space-y-3">
                            {lesson.clips.map((clip, ci) => (
                              <div key={clip.tempId} className="rounded-lg border bg-gray-50/60 p-3 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-gray-600">Clip {ci + 1}</span>
                                  {clip.cdnVideoId ? (
                                    clip.processingStatus === 'processing' ? (
                                      <span className="flex items-center gap-1.5 text-xs text-amber-600">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Se procesează pe CDN...
                                      </span>
                                    ) : clip.processingStatus === 'error' ? (
                                      <Badge variant="outline" className="text-red-600 border-red-400">✗ Eroare procesare</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-green-600 border-green-400">
                                        ✓ Video ({clip.cdnVideoId.slice(0, 8)}...)
                                      </Badge>
                                    )
                                  ) : clip.pendingFile ? (
                                    <span className="flex items-center gap-1.5 text-xs text-blue-600">
                                      📎 {clip.pendingFile.name} — va fi încărcat la salvare
                                    </span>
                                  ) : (
                                    <label className="cursor-pointer flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition">
                                      <Upload className="w-3.5 h-3.5" />
                                      Încarcă video
                                      <input
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) uploadClipVideo(section.tempId, lesson.tempId, clip, file);
                                        }}
                                      />
                                    </label>
                                  )}
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <span>Durată:</span>
                                    <span className="text-gray-700 font-medium">
                                      {clip.duration > 0 ? `${Math.floor(clip.duration / 60)}m ${clip.duration % 60}s` : '—'}
                                    </span>
                                  </div>
                                  <div className="ml-auto flex items-center gap-1">
                                    <button
                                      onClick={() => moveClip(section.tempId, lesson.tempId, clip.tempId, -1)}
                                      disabled={ci === 0}
                                      title="Mută sus"
                                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => moveClip(section.tempId, lesson.tempId, clip.tempId, 1)}
                                      disabled={ci === lesson.clips.length - 1}
                                      title="Mută jos"
                                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => removeClip(section.tempId, lesson.tempId, clip.tempId)}
                                      disabled={lesson.clips.length <= 1}
                                      title="Șterge clip"
                                      className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                {clip.cdnVideoId && clip.processingStatus !== 'processing' && (
                                  <TimelineEditor
                                    clip={clip}
                                    onChange={(c) => updateClip(section.tempId, lesson.tempId, c)}
                                  />
                                )}
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addClip(section.tempId, lesson.tempId)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" /> Adaugă clip
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="p-3 pl-8 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addLesson(section.tempId)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adaugă lecție
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addQuiz(section.tempId)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <ClipboardList className="w-3.5 h-3.5 mr-1" /> Adaugă quiz
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addSection} className="w-full border-dashed">
            <Plus className="w-4 h-4 mr-2" /> Adaugă secțiune
          </Button>

          <div className="flex flex-col gap-2 pt-4">
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep('info')} className="flex-1">
                ← Informații
              </Button>
              {course?.published ? (
                <Button
                  onClick={() => saveCurriculum(false)}
                  disabled={!canSaveCurriculum}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700"
                >
                  {savingCurriculum ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {savingCurriculum ? 'Se salvează...' : 'Salvează modificările'}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => saveCurriculum(false)} disabled={!canSaveCurriculum} className="flex-1">
                    {savingCurriculum ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {savingCurriculum ? 'Se salvează...' : 'Salvează draft'}
                  </Button>
                  <Button onClick={() => saveCurriculum(true)} disabled={!canSaveCurriculum} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    {savingCurriculum ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {savingCurriculum ? 'Se salvează...' : 'Publică cursul'}
                  </Button>
                </>
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => router.push(listPath)} className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40">
              Renunță la editare
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
