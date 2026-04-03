'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Upload, ChevronDown, ChevronRight, GripVertical, Video, Loader2, ImageIcon, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
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

const schema = z.object({
  title: z.string().min(3, 'Minim 3 caractere'),
  description: z.string().min(10, 'Minim 10 caractere'),
  price: z.coerce.number({ error: 'Prețul este obligatoriu' }).min(30, 'Prețul minim este 30 lei').max(2000, 'Prețul maxim este 2000 lei'),
  categoryId: z.string({ error: 'Categoria este obligatorie' }).min(1, 'Categoria este obligatorie'),
  level: z.string({ error: 'Nivelul este obligatoriu' }).min(1, 'Nivelul este obligatoriu'),
  language: z.string().default('ro'),
});
type FormData = z.infer<typeof schema>;

interface SectionItem {
  tempId: string;
  title: string;
  lessons: LessonItem[];
  expanded: boolean;
}
interface LessonItem {
  tempId: string;
  title: string;
  cdnVideoId: string;
  duration: number;
  isFree: boolean;
  uploading: boolean;
}

interface Instructor { _id: string; name: string; email: string; }

export default function NewCoursePage() {
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
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { data: instructorsData } = useQuery<{ users: Instructor[] }>({
    queryKey: ['admin-instructors'],
    queryFn: () => api.get('/admin/users', { params: { limit: 100 } }).then((r) => r.data),
    select: (data) => ({ users: data.users.filter((u: any) => u.role === 'instructor') }),
  });
  const instructors = instructorsData?.users ?? [];

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues, setValue } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { language: 'ro' },
  });

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
      });
      setCourseId(res.data._id);
      setStep('curriculum');
      toast.success('Curs creat! Adaugă acum secțiuni și lecții.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la creare curs');
    }
  };

  // Step 1: Create course
  const onSubmitInfo = async (data: FormData) => {
    if (!thumbnailUrl) {
      setThumbnailError('Thumbnail-ul este obligatoriu');
      return;
    }
    setThumbnailError('');
    if (!selectedInstructorId) {
      // Admin creează pe contul propriu (nu e instructor) — cere confirmare
      setPendingFormData(data);
      setShowAdminConfirm(true);
      return;
    }
    await doCreateCourse(data);
  };

  // Section management
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), title: 'Secțiune nouă', lessons: [], expanded: true },
    ]);
  };

  const updateSectionTitle = async (tempId: string, title: string, sectionDbId?: string) => {
    setSections((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, title } : s)),
    );
  };

  const saveSectionToDb = async (tempId: string, title: string) => {
    if (!courseId) return '';
    const res = await api.post(`/admin/courses/${courseId}/sections`, { title });
    return res.data._id as string;
  };

  const removeSection = (tempId: string) => {
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

  const updateLesson = (sectionTempId: string, lessonTempId: string, updates: Partial<LessonItem>) => {
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

  const removeLesson = (sectionTempId: string, lessonTempId: string) => {
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
      updateLesson(sectionTempId, lessonTempId, {
        cdnVideoId: data.videoId,
        uploading: false,
      });
      toast.success('Video încărcat cu succes!');
    } catch {
      updateLesson(sectionTempId, lessonTempId, { uploading: false });
      toast.error('Eroare la încărcarea videoclipului');
    }
  };

  // Step 2: Save curriculum and publish
  const saveCurriculum = async (publish: boolean) => {
    if (!courseId) return;
    try {
      for (const section of sections) {
        const sectionRes = await api.post(`/admin/courses/${courseId}/sections`, {
          title: section.title,
        });
        const sectionDbId = sectionRes.data._id;

        for (const lesson of section.lessons) {
          await api.post(`/admin/sections/${sectionDbId}/lessons`, {
            title: lesson.title,
            cdnVideoId: lesson.cdnVideoId,
            duration: lesson.duration,
            isFree: lesson.isFree,
          }, { params: { courseId } });
        }
      }

      if (publish) {
        await api.patch(`/admin/courses/${courseId}/publish`);
      }

      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success(publish ? 'Curs publicat cu succes!' : 'Curriculum salvat ca draft!');
      router.push('/admin/courses');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la salvare');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Curs nou</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        {['info', 'curriculum'].map((s, i) => (
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
              <Select onValueChange={(v) => setValue('level', v as string)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selectează nivel" />
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
            <Select onValueChange={(v) => setValue('categoryId', v as string)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selectează categorie" />
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
            <Select onValueChange={(v) => setSelectedInstructorId(!v || v === '__none__' ? '' : v as string)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Atribuie unui formator (opțional)" />
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
              Nu ai selectat un instructor. Cursul va fi atribuit contului tău de admin, care nu este un cont de instructor.
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
          {sections.map((section) => (
            <div key={section.tempId} className="bg-white rounded-xl border overflow-hidden">
              {/* Section header */}
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

              {/* Lessons */}
              {section.expanded && (
                <div className="divide-y">
                  {section.lessons.map((lesson) => (
                    <div key={lesson.tempId} className="p-4 pl-8 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Video className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <input
                          value={lesson.title}
                          onChange={(e) => updateLesson(section.tempId, lesson.tempId, { title: e.target.value })}
                          className="flex-1 text-sm border-b border-dashed border-gray-300 focus:outline-none focus:border-indigo-400 bg-transparent"
                          placeholder="Titlu lecție"
                        />
                        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={lesson.isFree}
                            onChange={(e) => updateLesson(section.tempId, lesson.tempId, { isFree: e.target.checked })}
                          />
                          Previzualizare gratuită
                        </label>
                        <button onClick={() => removeLesson(section.tempId, lesson.tempId)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Video upload */}
                      <div className="flex items-center gap-3 pl-7">
                        {lesson.cdnVideoId ? (
                          <Badge variant="outline" className="text-green-600 border-green-400">
                            ✓ Video încărcat ({lesson.cdnVideoId.slice(0, 8)}...)
                          </Badge>
                        ) : lesson.uploading ? (
                          <span className="flex items-center gap-2 text-xs text-indigo-600">
                            <Loader2 className="w-3 h-3 animate-spin" /> Se încarcă videoclipul...
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
                            onChange={(e) => updateLesson(section.tempId, lesson.tempId, { duration: parseInt(e.target.value) || 0 })}
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
            <Button
              variant="outline"
              onClick={() => saveCurriculum(false)}
              className="flex-1"
            >
              Salvează draft
            </Button>
            <Button
              onClick={() => saveCurriculum(true)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              Publică cursul
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
