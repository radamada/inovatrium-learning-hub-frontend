'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Upload, ChevronDown, ChevronRight, GripVertical, Video, Loader2, ImageIcon, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Category, Section } from '@/types';

const schema = z.object({
  title: z.string().min(3, 'Minim 3 caractere'),
  description: z.string().min(10, 'Minim 10 caractere'),
  price: z.coerce.number().min(0),
  categoryId: z.string({ error: 'Categoria este obligatorie' }).min(1, 'Categoria este obligatorie'),
  level: z.string({ error: 'Nivelul este obligatoriu' }).min(1, 'Nivelul este obligatoriu'),
  language: z.string().default('ro'),
});
type FormData = z.infer<typeof schema>;

interface SectionItem {
  dbId?: string;
  tempId: string;
  title: string;
  lessons: LessonItem[];
  expanded: boolean;
}
interface LessonItem {
  dbId?: string;
  tempId: string;
  title: string;
  cdnVideoId: string;
  duration: number;
  isFree: boolean;
  uploading: boolean;
}

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  const [sections, setSections] = useState<SectionItem[]>([]);
  const [step, setStep] = useState<'info' | 'curriculum'>('info');
  const [infoSaved, setInfoSaved] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [deletingThumb, setDeletingThumb] = useState(false);
  const [thumbnailError, setThumbnailError] = useState('');
  const [publishingChanges, setPublishingChanges] = useState(false);
  const [discardingChanges, setDiscardingChanges] = useState(false);
  const [curriculumInitialized, setCurriculumInitialized] = useState(false);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['admin-course', id],
    queryFn: () => api.get(`/admin/courses/${id}`).then((r) => r.data),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { data: curriculum } = useQuery<Section[]>({
    queryKey: ['curriculum', id],
    enabled: !!id,
    queryFn: () => api.get(`/courses/${id}/curriculum`).then((r) => r.data),
  });

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormData>({ resolver: zodResolver(schema) as any });
  const watchedLevel = watch('level');
  const watchedCategoryId = watch('categoryId');

  // Pre-populate form + thumbnail — pending values take priority over live
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
  }, [course, reset]);

  // Load curriculum: pending version takes priority; wait for course before deciding
  useEffect(() => {
    if (!course) return;

    if (course.pendingChanges?.curriculum) {
      setSections(
        course.pendingChanges.curriculum.map((s: any) => ({
          dbId: s.sectionId ?? undefined,
          tempId: s.sectionId ?? crypto.randomUUID(),
          title: s.title,
          expanded: true,
          lessons: s.lessons.map((l: any) => ({
            dbId: l.lessonId ?? undefined,
            tempId: l.lessonId ?? crypto.randomUUID(),
            title: l.title,
            cdnVideoId: l.cdnVideoId ?? '',
            duration: l.duration ?? 0,
            isFree: l.isFree ?? false,
            uploading: false,
          })),
        })),
      );
      setCurriculumInitialized(true);
    } else if (!curriculumInitialized && curriculum) {
      setSections(
        curriculum.map((s) => ({
          dbId: s._id,
          tempId: s._id,
          title: s.title,
          expanded: true,
          lessons: s.lessons.map((l) => ({
            dbId: l._id,
            tempId: l._id,
            title: l.title,
            cdnVideoId: l.cdnVideoId ?? '',
            duration: l.duration ?? 0,
            isFree: l.isFree,
            uploading: false,
          })),
        })),
      );
      setCurriculumInitialized(true);
    }
  }, [course, curriculum]);

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
      await api.patch(`/admin/courses/${id}/publish-changes`);
      qc.invalidateQueries({ queryKey: ['admin-course', id] });
      toast.success('Modificările au fost publicate!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la publicare');
    } finally {
      setPublishingChanges(false);
    }
  };

  const discardPendingChanges = async () => {
    setDiscardingChanges(true);
    try {
      await api.delete(`/admin/courses/${id}/pending-changes`);
      qc.invalidateQueries({ queryKey: ['admin-course', id] });
      toast.success('Modificările au fost anulate.');
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
    try {
      await api.patch(`/admin/courses/${id}`, { ...data, thumbnail: thumbnailUrl || undefined });
      setInfoSaved(true);
      setStep('curriculum');
      qc.invalidateQueries({ queryKey: ['admin-course', id] });
      toast.success(course?.published ? 'Modificări salvate (în așteptare)!' : 'Informații actualizate!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la actualizare');
    }
  };

  // Section management
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
    // For published courses, don't touch the live DB — changes are tracked in pending
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
    setSections((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, expanded: !s.expanded } : s)),
    );
  };

  const addLesson = (sectionTempId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? {
              ...s,
              lessons: [
                ...s.lessons,
                {
                  tempId: crypto.randomUUID(),
                  title: 'Lecție nouă',
                  cdnVideoId: '',
                  duration: 0,
                  isFree: false,
                  uploading: false,
                },
              ],
            }
          : s,
      ),
    );
  };

  const updateLesson = (
    sectionTempId: string,
    lessonTempId: string,
    updates: Partial<LessonItem>,
  ) => {
    setSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.tempId === lessonTempId ? { ...l, ...updates } : l,
              ),
            }
          : s,
      ),
    );
  };

  const removeLesson = async (sectionTempId: string, lessonTempId: string, dbId?: string) => {
    // For published courses, don't touch the live DB — changes are tracked in pending
    if (dbId && !course?.published) {
      try {
        await api.delete(`/admin/lessons/${dbId}`);
      } catch {
        toast.error('Eroare la ștergerea lecției');
        return;
      }
    }
    setSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId
          ? { ...s, lessons: s.lessons.filter((l) => l.tempId !== lessonTempId) }
          : s,
      ),
    );
  };

  const uploadVideo = async (sectionTempId: string, lessonTempId: string, file: File) => {
    updateLesson(sectionTempId, lessonTempId, { uploading: true });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      const { data } = await api.post('/media/upload-video', formData);
      updateLesson(sectionTempId, lessonTempId, { cdnVideoId: data.videoId, uploading: false });
      toast.success('Video încărcat cu succes!');
    } catch {
      updateLesson(sectionTempId, lessonTempId, { uploading: false });
      toast.error('Eroare la încărcarea videoclipului');
    }
  };

  const saveCurriculum = async (publish: boolean) => {
    try {
      if (course?.published) {
        // Published course — save curriculum snapshot as pending (nothing goes live yet)
        const pendingCurriculum = sections.map((s) => ({
          sectionId: s.dbId ?? null,
          title: s.title,
          lessons: s.lessons.map((l) => ({
            lessonId: l.dbId ?? null,
            title: l.title,
            cdnVideoId: l.cdnVideoId,
            duration: l.duration,
            isFree: l.isFree,
          })),
        }));
        await api.put(`/admin/courses/${id}/pending-curriculum`, { curriculum: pendingCurriculum });
        qc.invalidateQueries({ queryKey: ['admin-course', id] });
        toast.success('Curriculum salvat ca modificări în așteptare!');
        // Stay on page — banner lets them publish or discard
      } else {
        // Draft course — apply changes directly, individual API calls
        for (const section of sections) {
          let sectionDbId = section.dbId;

          if (!sectionDbId) {
            const res = await api.post(`/admin/courses/${id}/sections`, { title: section.title });
            sectionDbId = res.data._id;
          } else {
            await api.patch(`/admin/sections/${sectionDbId}`, { title: section.title });
          }

          for (const lesson of section.lessons) {
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

        if (publish) {
          await api.patch(`/admin/courses/${id}/publish`);
        }

        qc.invalidateQueries({ queryKey: ['admin-courses'] });
        qc.invalidateQueries({ queryKey: ['curriculum', id] });
        toast.success(publish ? 'Curs publicat!' : 'Curriculum salvat!');
        router.push('/admin/courses');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la salvare');
    }
  };

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
              Renunță
            </Button>
            <Button
              size="sm"
              disabled={publishingChanges || discardingChanges}
              onClick={publishPendingChanges}
              className="bg-amber-500 hover:bg-amber-600 text-white"
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
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
            )}
          </div>

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
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="99.99"
                {...register('price')}
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

          <div className="flex gap-3">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Se salvează...' : 'Salvează și continuă →'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('curriculum')}
            >
              Sari la Curriculum
            </Button>
          </div>
        </form>
      )}

      {/* Step 2: Curriculum */}
      {step === 'curriculum' && (
        <div className="space-y-4 max-w-3xl">
          {sections.map((section) => (
            <div key={section.tempId} className="bg-white rounded-xl border overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <input
                  value={section.title}
                  onChange={(e) => updateSectionTitle(section.tempId, e.target.value)}
                  className="flex-1 bg-transparent font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1"
                />
                <button
                  onClick={() => toggleSection(section.tempId)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {section.expanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => removeSection(section.tempId, section.dbId)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {section.expanded && (
                <div className="divide-y">
                  {section.lessons.map((lesson) => (
                    <div key={lesson.tempId} className="p-4 pl-8 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Video className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <input
                          value={lesson.title}
                          onChange={(e) =>
                            updateLesson(section.tempId, lesson.tempId, { title: e.target.value })
                          }
                          className="flex-1 text-sm border-b border-dashed border-gray-300 focus:outline-none focus:border-indigo-400 bg-transparent"
                          placeholder="Titlu lecție"
                        />
                        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={lesson.isFree}
                            onChange={(e) =>
                              updateLesson(section.tempId, lesson.tempId, {
                                isFree: e.target.checked,
                              })
                            }
                          />
                          Previzualizare gratuită
                        </label>
                        <button
                          onClick={() => removeLesson(section.tempId, lesson.tempId, lesson.dbId)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 pl-7">
                        {lesson.cdnVideoId ? (
                          <Badge variant="outline" className="text-green-600 border-green-400">
                            ✓ Video ({lesson.cdnVideoId.slice(0, 8)}...)
                          </Badge>
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
                          <span>Durată (sec):</span>
                          <input
                            type="number"
                            value={lesson.duration}
                            onChange={(e) =>
                              updateLesson(section.tempId, lesson.tempId, {
                                duration: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-16 border border-gray-300 rounded px-2 py-0.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="p-3 pl-8">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addLesson(section.tempId)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adaugă lecție
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
            {course?.published ? (
              <Button
                onClick={() => saveCurriculum(false)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                Salvează modificările
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => saveCurriculum(false)} className="flex-1">
                  Salvează draft
                </Button>
                <Button
                  onClick={() => saveCurriculum(true)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  Publică cursul
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
