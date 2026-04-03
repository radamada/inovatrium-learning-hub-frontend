'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Upload, ChevronDown, ChevronRight, GripVertical, Video, Loader2, ImageIcon, AlertTriangle, CheckCircle2, ClipboardList,
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

const schema = z.object({
  title: z.string().min(3, 'Minim 3 caractere'),
  description: z.string().min(10, 'Minim 10 caractere'),
  price: z.coerce.number({ error: 'Prețul este obligatoriu' }).min(30, 'Prețul minim este 30 lei').max(2000, 'Prețul maxim este 2000 lei'),
  categoryId: z.string({ error: 'Categoria este obligatorie' }).min(1, 'Categoria este obligatorie'),
  level: z.string({ error: 'Nivelul este obligatoriu' }).min(1, 'Nivelul este obligatoriu'),
  language: z.string().default('ro'),
});
type FormData = z.infer<typeof schema>;

interface QuizQuestionItem {
  question: string;
  options: string[];
  correctIndex: number;
}

interface LessonItem {
  dbId?: string;
  tempId: string;
  title: string;
  type: 'video' | 'quiz';
  cdnVideoId: string;
  duration: number;
  isFree: boolean;
  uploading: boolean;
  pendingFile?: File;
  processingStatus?: 'processing' | 'ready' | 'error';
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
  tempId: crypto.randomUUID(),
  title: 'Lecție nouă',
  type: 'video',
  cdnVideoId: '',
  duration: 0,
  isFree: false,
  uploading: false,
  questions: [],
  quizExpanded: true,
});

const newQuizLesson = (): LessonItem => ({
  tempId: crypto.randomUUID(),
  title: 'Quiz nou',
  type: 'quiz',
  cdnVideoId: '',
  duration: 0,
  isFree: false,
  uploading: false,
  questions: [{ question: '', options: ['', '', '', ''], correctIndex: 0 }],
  quizExpanded: true,
});

const newQuestion = (): QuizQuestionItem => ({
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
});

function sectionsKey(sects: SectionItem[]): string {
  return JSON.stringify(sects.map((s) => ({
    dbId: s.dbId,
    title: s.title,
    lessons: s.lessons.map((l) => ({
      dbId: l.dbId, title: l.title, type: l.type,
      cdnVideoId: l.cdnVideoId, duration: l.duration,
      isFree: l.isFree, questions: l.questions,
      hasPendingFile: !!l.pendingFile,
    })),
  })));
}

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);
  const [wylError, setWylError] = useState('');

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['admin-course', id],
    queryFn: () => api.get(`/admin/courses/${id}`).then((r) => r.data),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { data: curriculum } = useQuery<Section[]>({
    queryKey: ['admin-curriculum', id],
    enabled: !!id,
    queryFn: () => api.get(`/admin/courses/${id}/curriculum`).then((r) => r.data),
  });

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
  } = useForm<FormData>({ resolver: zodResolver(schema) as any });
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
      price: p.price ?? course.price,
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
    tempId: l._id ?? l.lessonId ?? crypto.randomUUID(),
    title: l.title,
    type: l.type ?? 'video',
    cdnVideoId: l.cdnVideoId ?? '',
    duration: l.duration ?? 0,
    isFree: l.isFree ?? false,
    uploading: false,
    questions: (l.questions ?? []).map((q: any) => ({
      question: q.question ?? '',
      options: q.options?.length === 4 ? q.options : ['', '', '', ''],
      correctIndex: q.correctIndex ?? 0,
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
          tempId: s.sectionId ?? crypto.randomUUID(),
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
    return () => {
      isMounted.current = false;
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  const startPolling = (videoId: string) => {
    pollingVideos.current.add(videoId);
    if (pollingInterval.current) return;
    pollingInterval.current = setInterval(async () => {
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
              lessons: s.lessons.map((l) => l.cdnVideoId === vid ? { ...l, processingStatus: 'ready' } : l),
            })));
          } else if (data.status === 5 || data.status === 6) {
            pollingVideos.current.delete(vid);
            setSections((prev) => prev.map((s) => ({
              ...s,
              lessons: s.lessons.map((l) => l.cdnVideoId === vid ? { ...l, processingStatus: 'error' } : l),
            })));
            toast.error('Eroare la procesarea videoclipului pe CDN');
          }
        } catch { /* keep polling on network error */ }
      }
      if (pollingVideos.current.size === 0 && pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }, 5000);
  };

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
          cdnVideoId: l.type === 'video' ? l.cdnVideoId : '',
          duration: l.type === 'video' ? l.duration : 0,
          isFree: l.type === 'video' ? l.isFree : false,
          questions: l.type === 'quiz' ? l.questions : [],
        })),
      }));
      if (pendingCurriculum.length > 0) {
        await api.put(`/admin/courses/${id}/pending-curriculum`, { curriculum: pendingCurriculum });
      }
      await api.patch(`/admin/courses/${id}/publish-changes`);
      qc.invalidateQueries({ queryKey: ['admin-course', id] });
      qc.invalidateQueries({ queryKey: ['admin-curriculum', id] });
      toast.success('Modificările au fost publicate!');
      router.push('/admin/courses');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la publicare');
    } finally {
      setPublishingChanges(false);
    }
  };

  const discardPendingChanges = async () => {
    setDiscardingChanges(true);
    try {
      const pageVideoIds = sections
        .flatMap((s) => s.lessons)
        .filter((l) => l.cdnVideoId)
        .map((l) => l.cdnVideoId as string);
      await api.delete(`/admin/courses/${id}/pending-changes`, { data: { videoIds: pageVideoIds } });
      qc.invalidateQueries({ queryKey: ['admin-course', id] });
      toast.success('Modificările au fost anulate.');
      router.push('/admin/courses');
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
      await api.patch(`/admin/courses/${id}`, {
        ...data,
        thumbnail: thumbnailUrl || undefined,
        whatYouLearn: whatYouLearn.filter(Boolean),
      });
      setStep('curriculum');
      qc.invalidateQueries({ queryKey: ['admin-course', id] });
      toast.success(course?.published ? 'Modificări salvate (în așteptare)!' : 'Informații actualizate!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la actualizare');
    }
  };

  // ── Section helpers ──────────────────────────────────────────────────────

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), title: 'Secțiune nouă', lessons: [], expanded: true },
    ]);
  };

  const updateSectionTitle = (tempId: string, title: string) => {
    setSections((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, title } : s)));
  };

  const removeSection = async (tempId: string, dbId?: string) => {
    if (dbId && !course?.published) {
      try {
        await api.delete(`/admin/sections/${dbId}`);
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

  const removeLesson = async (sectionTempId: string, lessonTempId: string, dbId?: string) => {
    if (dbId && !course?.published) {
      try {
        await api.delete(`/admin/lessons/${dbId}`);
      } catch {
        toast.error('Eroare la ștergerea lecției');
        return;
      }
    }
    // New lesson (no dbId) with an uploaded video — clean up CDN immediately
    if (!dbId) {
      const lesson = sections.flatMap((s) => s.lessons).find((l) => l.tempId === lessonTempId);
      if (lesson?.cdnVideoId) {
        api.delete(`/media/video/${lesson.cdnVideoId}`).catch(() => null);
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
        api.delete(`/admin/courses/${id}/pending-changes`, { data: { videoIds: [] } })
          .then(() => qc.invalidateQueries({ queryKey: ['admin-course', id] }))
          .catch(() => null);
      }
    }

    setSections(newSections);
  };

  const uploadVideo = async (sectionTempId: string, lessonTempId: string, file: File) => {
    const duration = await new Promise<number>((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(video.duration) || 0); };
      video.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
      video.src = url;
    });
    updateLesson(sectionTempId, lessonTempId, { pendingFile: file, duration, cdnVideoId: '', processingStatus: undefined });
  };

  // ── Quiz question helpers ─────────────────────────────────────────────────

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
                  ? { ...l, questions: l.questions.map((q, i) => (i === qIdx ? { ...q, ...updates } : q)) }
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
      // ── Step 1: Upload pending video files to CDN ──────────────────────
      const pendingLessons = sections.flatMap((s) => s.lessons).filter((l) => l.pendingFile);
      const uploadedMap = new Map<string, string>();

      if (pendingLessons.length > 0) {
        const results = await Promise.allSettled(
          pendingLessons.map(async (l) => {
            const formData = new FormData();
            formData.append('file', l.pendingFile!);
            formData.append('title', l.title);
            const { data } = await api.post('/media/upload-video', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            return { tempId: l.tempId, videoId: data.videoId as string };
          }),
        );

        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) {
          for (const r of results) {
            if (r.status === 'fulfilled') api.delete(`/media/video/${r.value.videoId}`).catch(() => null);
          }
          toast.error('Eroare la încărcarea videoclipurilor. Încearcă din nou.');
          return;
        }

        for (const r of results) {
          if (r.status === 'fulfilled') uploadedMap.set(r.value.tempId, r.value.videoId);
        }

        setSections((prev) => prev.map((s) => ({
          ...s,
          lessons: s.lessons.map((l) => {
            const videoId = uploadedMap.get(l.tempId);
            if (videoId) { startPolling(videoId); return { ...l, cdnVideoId: videoId, pendingFile: undefined, processingStatus: 'processing' }; }
            return l;
          }),
        })));
      }

      const resolvedSections = sections.map((s) => ({
        ...s,
        lessons: s.lessons.map((l) => ({ ...l, cdnVideoId: uploadedMap.get(l.tempId) ?? l.cdnVideoId })),
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
            cdnVideoId: l.type === 'video' ? l.cdnVideoId : '',
            duration: l.type === 'video' ? l.duration : 0,
            isFree: l.type === 'video' ? l.isFree : false,
            questions: l.type === 'quiz' ? l.questions : [],
          })),
        }));
        await api.put(`/admin/courses/${id}/pending-curriculum`, { curriculum: pendingCurriculum });
        initialSectionsRef.current = sectionsKey(resolvedSections);
        qc.invalidateQueries({ queryKey: ['admin-course', id] });
        toast.success('Curriculum salvat ca modificări în așteptare!');
      } else {
        for (const section of resolvedSections) {
          let sectionDbId = section.dbId;

          if (!sectionDbId) {
            const res = await api.post(`/admin/courses/${id}/sections`, { title: section.title });
            sectionDbId = res.data._id;
          } else {
            await api.patch(`/admin/sections/${sectionDbId}`, { title: section.title });
          }

          for (const lesson of section.lessons) {
            if (lesson.type === 'quiz') {
              if (!lesson.dbId) {
                await api.post(
                  `/admin/courses/${id}/sections/${sectionDbId}/quizzes`,
                  { title: lesson.title, questions: lesson.questions },
                );
              } else {
                await api.patch(
                  `/admin/courses/${id}/quizzes/${lesson.dbId}`,
                  { title: lesson.title, questions: lesson.questions },
                );
              }
            } else {
              if (!lesson.dbId) {
                await api.post(
                  `/admin/sections/${sectionDbId}/lessons`,
                  { title: lesson.title, cdnVideoId: lesson.cdnVideoId, duration: lesson.duration, isFree: lesson.isFree },
                  { params: { courseId: id } },
                );
              } else {
                await api.patch(`/admin/lessons/${lesson.dbId}`, {
                  title: lesson.title, cdnVideoId: lesson.cdnVideoId, duration: lesson.duration, isFree: lesson.isFree,
                });
              }
            }
          }
        }

        if (publish) {
          await api.patch(`/admin/courses/${id}/publish`);
        }

        initialSectionsRef.current = sectionsKey(resolvedSections);
        qc.invalidateQueries({ queryKey: ['admin-courses'] });
        qc.invalidateQueries({ queryKey: ['admin-curriculum', id] });
        toast.success(publish ? 'Curs publicat!' : 'Curriculum salvat!');
        router.push('/admin/courses');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la salvare');
    } finally {
      setSavingCurriculum(false);
    }
  };

  const curriculumDirty = curriculumInitialized && sectionsKey(sections) !== initialSectionsRef.current;
  const hasVideoWithoutCdn = sections.some((s) => s.lessons.some((l) => l.type === 'video' && !l.cdnVideoId && !l.pendingFile));
  const hasProcessingVideo = sections.some((s) => s.lessons.some((l) => l.processingStatus === 'processing'));
  const canSaveCurriculum = (curriculumDirty || isDirty) && !hasVideoWithoutCdn && !hasProcessingVideo && !savingCurriculum;

  if (courseLoading) {
    return <div className="text-gray-400 p-8">Se încarcă...</div>;
  }

  return (
    <div>
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
                step === s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
            <span className={`text-sm font-medium ${step === s ? 'text-indigo-600' : 'text-gray-500'}`}>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
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
                <label className={`cursor-pointer w-32 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-indigo-400 hover:bg-indigo-50 transition ${uploadingThumb ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploadingThumb ? (
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
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
              <Input type="number" step="0.01" min="30" max="2000" placeholder="ex: 99 (30–2000 lei)" {...register('price')} className="mt-1" />
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
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Se salvează...' : 'Salvează și continuă →'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep('curriculum')}>
                Sari la Curriculum
              </Button>
            </div>
            <Button type="button" variant="outline" onClick={() => router.push('/admin/courses')} className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40">
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
                  className="flex-1 bg-transparent font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1"
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
                            <ClipboardList className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <input
                              value={lesson.title}
                              onChange={(e) => updateLesson(section.tempId, lesson.tempId, { title: e.target.value })}
                              className="flex-1 text-sm border-b border-dashed border-gray-300 focus:outline-none focus:border-indigo-400 bg-transparent"
                              placeholder="Titlu quiz"
                            />
                            <Badge variant="outline" className="text-indigo-600 border-indigo-300 text-xs">Quiz</Badge>
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
                                    <span className="text-xs font-bold text-indigo-600 mt-1 w-5 flex-shrink-0">{qIdx + 1}.</span>
                                    <input
                                      value={q.question}
                                      onChange={(e) => updateQuestion(section.tempId, lesson.tempId, qIdx, { question: e.target.value })}
                                      className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 bg-white"
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
                                          type="radio"
                                          name={`correct-${lesson.tempId}-${qIdx}`}
                                          checked={q.correctIndex === oIdx}
                                          onChange={() => updateQuestion(section.tempId, lesson.tempId, qIdx, { correctIndex: oIdx })}
                                          className="accent-indigo-600"
                                          title="Răspuns corect"
                                        />
                                        <span className="text-xs text-gray-500 w-4 flex-shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                                        <input
                                          value={opt}
                                          onChange={(e) => updateOption(section.tempId, lesson.tempId, qIdx, oIdx, e.target.value)}
                                          className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 bg-white"
                                          placeholder={`Opțiunea ${String.fromCharCode(65 + oIdx)}`}
                                        />
                                      </div>
                                    ))}
                                    <p className="text-xs text-gray-400 mt-1">Selectează cercul radio pentru a marca răspunsul corect.</p>
                                  </div>
                                </div>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addQuestion(section.tempId, lesson.tempId)}
                                className="text-indigo-600 hover:text-indigo-800 text-xs"
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
                            <Video className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <input
                              value={lesson.title}
                              onChange={(e) => updateLesson(section.tempId, lesson.tempId, { title: e.target.value })}
                              className="flex-1 text-sm border-b border-dashed border-gray-300 focus:outline-none focus:border-indigo-400 bg-transparent"
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

                          <div className="flex items-center gap-3 pl-7">
                            {lesson.cdnVideoId ? (
                              lesson.processingStatus === 'processing' ? (
                                <span className="flex items-center gap-2 text-xs text-amber-600">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Se procesează pe CDN...
                                </span>
                              ) : lesson.processingStatus === 'error' ? (
                                <Badge variant="outline" className="text-red-600 border-red-400">
                                  ✗ Eroare procesare
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-600 border-green-400">
                                  ✓ Video ({lesson.cdnVideoId.slice(0, 8)}...)
                                </Badge>
                              )
                            ) : lesson.pendingFile ? (
                              <span className="flex items-center gap-2 text-xs text-indigo-600">
                                📎 {lesson.pendingFile.name} — va fi încărcat la salvare
                              </span>
                            ) : lesson.uploading ? (
                              <span className="flex items-center gap-2 text-xs text-indigo-600">
                                <Loader2 className="w-3 h-3 animate-spin" /> Se încarcă...
                              </span>
                            ) : (
                              <label className="cursor-pointer flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 border border-dashed border-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition">
                                <Upload className="w-3.5 h-3.5" />
                                Încarcă video
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadVideo(section.tempId, lesson.tempId, file);
                                  }}
                                />
                              </label>
                            )}
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <span>Durată:</span>
                              <span className="text-gray-700 font-medium">
                                {lesson.duration > 0 ? `${Math.floor(lesson.duration / 60)}m ${lesson.duration % 60}s` : '—'}
                              </span>
                            </div>
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
                      className="text-indigo-600 hover:text-indigo-800"
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
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700"
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
                  <Button onClick={() => saveCurriculum(true)} disabled={!canSaveCurriculum} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                    {savingCurriculum ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {savingCurriculum ? 'Se salvează...' : 'Publică cursul'}
                  </Button>
                </>
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => router.push('/admin/courses')} className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40">
              Renunță la editare
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
