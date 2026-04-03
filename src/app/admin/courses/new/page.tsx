'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Upload, ChevronDown, ChevronRight, GripVertical, Video, Loader2, ImageIcon, AlertTriangle, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Category } from '@/types';
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
  tempId: string;
  dbId?: string;
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
  tempId: string;
  dbId?: string;
  title: string;
  lessons: LessonItem[];
  expanded: boolean;
}

interface Instructor { _id: string; name: string; email: string; }

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

export default function AdminNewCoursePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [step, setStep] = useState<'info' | 'curriculum'>('info');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [deletingThumb, setDeletingThumb] = useState(false);
  const [thumbnailError, setThumbnailError] = useState('');
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');
  const [whatYouLearn, setWhatYouLearn] = useState<string[]>([]);
  const [wylError, setWylError] = useState('');
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [savingCurriculum, setSavingCurriculum] = useState(false);
  const [curriculumSaved, setCurriculumSaved] = useState(false);
  const [publishingCourse, setPublishingCourse] = useState(false);
  const pollingVideos = useRef<Set<string>>(new Set());
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { data: instructors = [] } = useQuery<Instructor[]>({
    queryKey: ['admin-instructors'],
    queryFn: () => api.get('/admin/instructors').then((r) => r.data),
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { language: 'ro' },
  });
  const watchedLevel = watch('level');
  const watchedCategoryId = watch('categoryId');

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  // Guard: warn before leaving while course is created but curriculum not saved yet
  useEffect(() => {
    if (!courseId) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [courseId]);

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

  const doCreateCourse = async (data: FormData) => {
    try {
      const res = await api.post('/admin/courses', {
        ...data,
        thumbnail: thumbnailUrl || undefined,
        instructorId: selectedInstructorId || undefined,
        whatYouLearn: whatYouLearn.filter(Boolean),
      });
      setCourseId(res.data._id);
      setStep('curriculum');
      toast.success('Curs creat! Adaugă acum secțiuni și lecții.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la creare curs');
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
    if (!selectedInstructorId) {
      setPendingFormData(data);
      setShowAdminConfirm(true);
      return;
    }
    await doCreateCourse(data);
  };

  // Reset curriculumSaved on any user-initiated curriculum change (not polling updates)
  const mutateSections = (updater: (prev: SectionItem[]) => SectionItem[]) => {
    setCurriculumSaved(false);
    setSections(updater);
  };

  // ── Section helpers ──────────────────────────────────────────────────────

  const addSection = () => {
    mutateSections((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), title: 'Secțiune nouă', lessons: [], expanded: true },
    ]);
  };

  const updateSectionTitle = (tempId: string, title: string) => {
    mutateSections((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, title } : s)));
  };

  const removeSection = (tempId: string) => {
    const section = sections.find((s) => s.tempId === tempId);
    section?.lessons.forEach((l) => {
      if (l.cdnVideoId) {
        pollingVideos.current.delete(l.cdnVideoId);
        api.delete(`/media/video/${l.cdnVideoId}`).catch(() => null);
      }
    });
    if (section?.dbId) {
      api.delete(`/admin/sections/${section.dbId}`).catch(() => null);
      setSections((prev) => prev.filter((s) => s.tempId !== tempId));
    } else {
      mutateSections((prev) => prev.filter((s) => s.tempId !== tempId));
    }
  };

  const toggleSection = (tempId: string) => {
    setSections((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, expanded: !s.expanded } : s)));
  };

  // ── Lesson helpers ────────────────────────────────────────────────────────

  const addLesson = (sectionTempId: string) => {
    mutateSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId ? { ...s, lessons: [...s.lessons, newVideoLesson()] } : s,
      ),
    );
  };

  const addQuiz = (sectionTempId: string) => {
    mutateSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId ? { ...s, lessons: [...s.lessons, newQuizLesson()] } : s,
      ),
    );
  };

  const updateLesson = (sectionTempId: string, lessonTempId: string, updates: Partial<LessonItem>) => {
    mutateSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? { ...s, lessons: s.lessons.map((l) => (l.tempId === lessonTempId ? { ...l, ...updates } : l)) }
          : s,
      ),
    );
  };

  const removeLesson = (sectionTempId: string, lessonTempId: string) => {
    const lesson = sections.flatMap((s) => s.lessons).find((l) => l.tempId === lessonTempId);
    if (lesson?.cdnVideoId) {
      pollingVideos.current.delete(lesson.cdnVideoId);
      api.delete(`/media/video/${lesson.cdnVideoId}`).catch(() => null);
    }
    if (lesson?.dbId) {
      // Already saved to backend — delete immediately, keep curriculumSaved intact
      api.delete(`/admin/lessons/${lesson.dbId}`).catch(() => null);
      setSections((prev) =>
        prev.map((s) =>
          s.tempId === sectionTempId
            ? { ...s, lessons: s.lessons.filter((l) => l.tempId !== lessonTempId) }
            : s,
        ),
      );
    } else {
      mutateSections((prev) =>
        prev.map((s) =>
          s.tempId === sectionTempId
            ? { ...s, lessons: s.lessons.filter((l) => l.tempId !== lessonTempId) }
            : s,
        ),
      );
    }
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

  // ── Quiz question helpers ────────────────────────────────────────────────

  const addQuestion = (sectionTempId: string, lessonTempId: string) => {
    mutateSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.tempId === lessonTempId ? { ...l, questions: [...l.questions, newQuestion()] } : l,
              ),
            }
          : s,
      ),
    );
  };

  const removeQuestion = (sectionTempId: string, lessonTempId: string, qIdx: number) => {
    mutateSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.tempId === lessonTempId ? { ...l, questions: l.questions.filter((_, i) => i !== qIdx) } : l,
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
    mutateSections((prev) =>
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
    mutateSections((prev) =>
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
    if (!courseId || savingCurriculum) return;
    setSavingCurriculum(true);

    // Declared outside try so `finally` can persist partial dbIds on error
    const sectionDbIdMap = new Map<string, string>();
    const lessonDbIdMap = new Map<string, string>();

    try {
      // Step 1: Upload pending video files
      const pendingLessons = sections.flatMap((s) => s.lessons).filter((l) => l.pendingFile);
      const uploadedMap = new Map<string, string>(); // tempId → cdnVideoId

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

      // Step 2: Create sections and lessons (skip already-created items for idempotent retry)
      for (const section of resolvedSections) {
        let sectionDbId: string = section.dbId ?? '';

        if (!sectionDbId) {
          const sectionRes = await api.post(`/admin/courses/${courseId}/sections`, { title: section.title });
          sectionDbId = sectionRes.data._id;
          sectionDbIdMap.set(section.tempId, sectionDbId);
        }

        for (const lesson of section.lessons) {
          if (lesson.dbId) continue; // Already created in a previous partial save

          if (lesson.type === 'quiz') {
            const res = await api.post(
              `/admin/courses/${courseId}/sections/${sectionDbId}/quizzes`,
              { title: lesson.title, questions: lesson.questions },
            );
            lessonDbIdMap.set(lesson.tempId, res.data._id);
          } else {
            const res = await api.post(
              `/admin/sections/${sectionDbId}/lessons`,
              { title: lesson.title, cdnVideoId: lesson.cdnVideoId, duration: lesson.duration, isFree: lesson.isFree },
              { params: { courseId } },
            );
            lessonDbIdMap.set(lesson.tempId, res.data._id);
          }
        }
      }

      if (publish) {
        await api.patch(`/admin/courses/${courseId}/publish`);
      }

      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      if (publish) {
        toast.success('Curs publicat cu succes!');
        router.push('/admin/courses');
      } else {
        setCurriculumSaved(true);
        toast.success('Curriculum salvat! Videoclipurile se procesează pe CDN...');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la salvare');
    } finally {
      // Always persist dbIds collected so far (even on partial failure)
      if (sectionDbIdMap.size > 0 || lessonDbIdMap.size > 0) {
        setSections((prev) => prev.map((s) => ({
          ...s,
          dbId: sectionDbIdMap.get(s.tempId) ?? s.dbId,
          lessons: s.lessons.map((l) => ({
            ...l,
            dbId: lessonDbIdMap.get(l.tempId) ?? l.dbId,
          })),
        })));
      }
      setSavingCurriculum(false);
    }
  };

  const publishCourse = async () => {
    if (!courseId) return;
    setPublishingCourse(true);
    try {
      await api.patch(`/admin/courses/${courseId}/publish`);
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Curs publicat cu succes!');
      router.push('/admin/courses');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la publicare');
    } finally {
      setPublishingCourse(false);
    }
  };

  const hasVideoWithoutCdn = sections.some((s) => s.lessons.some((l) => l.type === 'video' && !l.cdnVideoId && !l.pendingFile));
  const hasPendingFiles = sections.some((s) => s.lessons.some((l) => !!l.pendingFile));
  const hasProcessingVideo = sections.some((s) => s.lessons.some((l) => l.processingStatus === 'processing'));
  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const canSaveDraft = !hasVideoWithoutCdn && !savingCurriculum && !curriculumSaved;
  const canPublish = !hasVideoWithoutCdn && !hasPendingFiles && !hasProcessingVideo && !savingCurriculum;
  const canPublishAfterSave = totalLessons > 0 && !hasVideoWithoutCdn && !hasPendingFiles && !hasProcessingVideo && !publishingCourse;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Curs nou</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        {(['info', 'curriculum'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {i + 1}
            </div>
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

          <div>
            <Label>Formator</Label>
            <Select
              value={selectedInstructorId || '__none__'}
              onValueChange={(v) => setSelectedInstructorId(!v || v === '__none__' ? '' : v)}
            >
              <SelectTrigger className="mt-1">
                <span>
                  {selectedInstructorId
                    ? (instructors.find((i) => i._id === selectedInstructorId)
                        ? `${instructors.find((i) => i._id === selectedInstructorId)!.name} (${instructors.find((i) => i._id === selectedInstructorId)!.email})`
                        : 'Formator')
                    : '— Neatribuit (contul adminului) —'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Neatribuit (contul adminului) —</SelectItem>
                {instructors.map((i) => (
                  <SelectItem key={i._id} value={i._id}>{i.name} ({i.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedInstructorId && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Cursul va fi atribuit contului tău de admin.
              </p>
            )}
          </div>

          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Se creează...' : 'Continuă → Curriculum'}
          </Button>
        </form>
      )}

      <Dialog open={showAdminConfirm} onOpenChange={setShowAdminConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Curs atribuit contului tău
            </DialogTitle>
            <DialogDescription>
              Nu ai selectat un formator. Cursul va fi atribuit contului tău de admin, care nu este un cont de formator.
              Ești sigur că vrei să continui?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminConfirm(false)}>Anulează</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={async () => {
                setShowAdminConfirm(false);
                if (pendingFormData) await doCreateCourse(pendingFormData);
              }}
            >
              Da, continuă
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <button onClick={() => removeSection(section.tempId)} className="text-red-400 hover:text-red-600">
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
                            <button onClick={() => removeLesson(section.tempId, lesson.tempId)} className="text-red-400 hover:text-red-600">
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
                            <button onClick={() => removeLesson(section.tempId, lesson.tempId)} className="text-red-400 hover:text-red-600">
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

          <div className="flex gap-3 pt-4">
            {!curriculumSaved ? (
              <>
                <Button variant="outline" onClick={() => saveCurriculum(false)} disabled={!canSaveDraft} className="flex-1">
                  {savingCurriculum ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {savingCurriculum ? 'Se salvează...' : 'Salvează draft'}
                </Button>
                <Button
                  onClick={() => saveCurriculum(true)}
                  disabled={!canPublish}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  title={hasPendingFiles ? 'Încarcă toate videoclipurile înainte de publicare' : hasProcessingVideo ? 'Așteptați finalizarea procesării videoclipurilor' : undefined}
                >
                  {savingCurriculum ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {savingCurriculum ? 'Se salvează...' : 'Publică cursul'}
                </Button>
              </>
            ) : (
              <Button
                onClick={publishCourse}
                disabled={!canPublishAfterSave}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                title={hasProcessingVideo ? 'Așteptați finalizarea procesării videoclipurilor' : totalLessons === 0 ? 'Adaugă cel puțin o lecție' : undefined}
              >
                {(hasProcessingVideo || publishingCourse) ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {publishingCourse ? 'Se publică...' : hasProcessingVideo ? 'Se procesează videoclipurile...' : 'Publică cursul'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
