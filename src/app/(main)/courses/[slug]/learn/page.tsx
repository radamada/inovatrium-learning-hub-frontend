'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Circle, ChevronRight, Lock, Trophy, Download, NotebookPen, Save } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import VideoPlayer from '@/components/player/VideoPlayer';
import api from '@/lib/api';
import type { Section, Lesson, Enrollment } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const isAutoComplete = useRef(false);

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [noteSaved, setNoteSaved] = useState(true);
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch course
  const { data: course } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => api.get(`/courses/${slug}`).then((r) => r.data),
  });

  // Fetch curriculum
  const { data: curriculum } = useQuery<Section[]>({
    queryKey: ['curriculum', course?._id],
    enabled: !!course,
    queryFn: () => api.get(`/courses/${course._id}/curriculum`).then((r) => r.data),
  });

  // Fetch enrollment + progress
  const { data: enrollment, isError: enrollmentError } = useQuery<Enrollment>({
    queryKey: ['progress', course?._id, user?._id],
    enabled: !!user && !!course,
    queryFn: () => api.get(`/enrollments/${course._id}/progress`).then((r) => r.data),
    retry: false,
  });

  // If not logged in → login
  useEffect(() => {
    if (!user) { router.push(`/login?from=/courses/${slug}/learn`); return; }
  }, [user]);

  // If refunded or not enrolled → back to course page
  useEffect(() => {
    if (enrollment?.status === 'refunded') {
      toast.error('Accesul la acest curs a fost revocat. Cumpără-l din nou pentru a continua.');
      router.push(`/courses/${slug}`);
    }
  }, [enrollment]);

  useEffect(() => {
    if (enrollmentError) {
      router.push(`/courses/${slug}`);
    }
  }, [enrollmentError]);

  // Notes — defined after queries so `course` is in scope
  const saveNote = useCallback(async (content: string) => {
    if (!course || !selectedLesson) return;
    try {
      await api.put(`/notes/${course._id}/${selectedLesson._id}`, { content });
      setNoteSaved(true);
    } catch {
      // silent fail
    }
  }, [course, selectedLesson]);

  const handleNoteChange = (v: string) => {
    setNoteContent(v);
    setNoteSaved(false);
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(() => saveNote(v), 1500);
  };

  // Fetch note when lesson changes
  useEffect(() => {
    if (!course || !selectedLesson) return;
    setNoteContent('');
    setNoteSaved(true);
    api.get(`/notes/${course._id}/${selectedLesson._id}`)
      .then((r) => setNoteContent(r.data?.content ?? ''))
      .catch(() => {});
  }, [selectedLesson?._id, course?._id]);

  // Auto-select first lesson
  useEffect(() => {
    if (curriculum && curriculum.length > 0 && !selectedLesson) {
      const firstLesson = curriculum[0]?.lessons?.[0];
      if (firstLesson) selectLesson(firstLesson);
    }
  }, [curriculum]);

  const selectLesson = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    if (!lesson.cdnVideoId || !course) return;
    try {
      const { data } = await api.get(`/media/play-url/${lesson.cdnVideoId}`, {
        params: { courseId: course._id },
      });
      setVideoUrl(data.url);
    } catch {
      toast.error('Eroare la încărcarea videoclipului');
    }
  };

  // Mark lesson complete
  const completeMutation = useMutation({
    mutationFn: (lessonId: string) =>
      api.patch(`/enrollments/${course?._id}/lessons/${lessonId}/progress`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress', course?._id, user?._id] });
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      if (isAutoComplete.current) {
        toast.success('Lecție finalizată automat!');
        isAutoComplete.current = false;
      }
    },
  });

  const completedIds = enrollment?.completedLessons ?? [];
  const allLessons = curriculum?.flatMap((s) => s.lessons) ?? [];
  const progress = allLessons.length > 0
    ? Math.round((completedIds.length / allLessons.length) * 100)
    : 0;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
      {/* Sidebar – curriculum */}
      <aside className="w-full lg:w-80 xl:w-96 border-r bg-white overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="font-bold text-base truncate">{course?.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {completedIds.length}/{allLessons.length} lecții completate
          </p>
        </div>

        <div className="divide-y">
          {curriculum?.map((section) => (
            <div key={section._id}>
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {section.title}
              </div>
              {section.lessons.map((lesson) => {
                const isDone = completedIds.includes(lesson._id);
                const isSelected = selectedLesson?._id === lesson._id;
                return (
                  <button
                    key={lesson._id}
                    onClick={() => selectLesson(lesson)}
                    className={`w-full text-left flex items-center gap-3 p-3 pl-4 text-sm transition hover:bg-indigo-50 ${
                      isSelected ? 'bg-indigo-50 border-l-2 border-indigo-600' : ''
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={isDone ? 'line-through text-gray-400' : ''}>
                      {lesson.title}
                    </span>
                    {lesson.duration > 0 && (
                      <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                        {Math.floor(lesson.duration / 60)}m
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Main – player + lesson info */}
      <div className="flex-1 overflow-y-auto">
        {enrollment?.completedAt && (
          <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-3 text-green-800">
            <Trophy className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="font-semibold">Felicitări! Ai finalizat cursul.</span>
            <button
              onClick={async () => {
                try {
                  const res = await api.get(`/enrollments/${course?._id}/certificate`, { responseType: 'blob' });
                  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `certificat-${course?.slug ?? course?._id}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  toast.error('Eroare la descărcarea certificatului');
                }
              }}
              className="ml-auto flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Descarcă certificatul
            </button>
          </div>
        )}
        <div className="p-4 md:p-8 max-w-4xl">
          {selectedLesson ? (
            <>
              {videoUrl ? (
                <VideoPlayer
                  src={videoUrl}
                  onEnded={() => {
                    isAutoComplete.current = true;
                    completeMutation.mutate(selectedLesson._id);
                  }}
                />
              ) : (
                <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
                  <p className="text-gray-400">Selectează o lecție cu conținut video</p>
                </div>
              )}

              <div className="mt-6">
                <h1 className="text-2xl font-bold">{selectedLesson.title}</h1>
                {selectedLesson.description && (
                  <p className="text-gray-600 mt-2">{selectedLesson.description}</p>
                )}

                <div className="flex gap-3 mt-4">
                  {!completedIds.includes(selectedLesson._id) && (
                    <Button
                      onClick={() => completeMutation.mutate(selectedLesson._id)}
                      disabled={completeMutation.isPending}
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marchează ca finalizat
                    </Button>
                  )}
                  {/* Next lesson */}
                  {(() => {
                    const flat = curriculum?.flatMap((s) => s.lessons) ?? [];
                    const idx = flat.findIndex((l) => l._id === selectedLesson._id);
                    const next = flat[idx + 1];
                    return next ? (
                      <Button variant="ghost" onClick={() => selectLesson(next)}>
                        Lecția următoare <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : null;
                  })()}
                </div>

                {/* Notes */}
                <div className="mt-8 border-t pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <NotebookPen className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-semibold text-gray-800">Notițele mele</h3>
                    <span className={`ml-auto text-xs flex items-center gap-1 ${noteSaved ? 'text-green-500' : 'text-gray-400'}`}>
                      <Save className="w-3 h-3" />
                      {noteSaved ? 'Salvat' : 'Se salvează...'}
                    </span>
                  </div>
                  <Textarea
                    placeholder="Scrie notițe pentru această lecție..."
                    value={noteContent}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-400">
              Selectează o lecție din stânga pentru a începe.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
