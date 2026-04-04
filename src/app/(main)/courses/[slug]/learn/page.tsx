'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Circle, ChevronRight, Lock, Trophy, Download, NotebookPen, Save, ClipboardList, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import VideoPlayer from '@/components/player/VideoPlayer';
import QuizPlayer from '@/components/QuizPlayer';
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
  const [downloadingCert, setDownloadingCert] = useState(false);
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch course — use enrollment-aware endpoint so retracted courses remain accessible for enrolled students
  const { data: course, isError: courseError } = useQuery({
    queryKey: ['course-access', slug],
    enabled: !!user,
    queryFn: () => api.get(`/courses/${slug}/access`).then((r) => r.data),
    retry: false,
  });

  // Fetch curriculum — use enrollment-aware endpoint for retracted courses
  const { data: curriculum } = useQuery<Section[]>({
    queryKey: ['curriculum', course?._id],
    enabled: !!course,
    queryFn: () => {
      const endpoint = course.published
        ? `/courses/${course._id}/curriculum`
        : `/courses/${course._id}/curriculum/enrolled`;
      return api.get(endpoint).then((r) => r.data);
    },
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
    if (enrollmentError || courseError) {
      router.push(`/courses/${slug}`);
    }
  }, [enrollmentError, courseError]);

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

  // Cleanup note save timer on unmount
  useEffect(() => {
    return () => {
      if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    };
  }, []);

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
      if (firstLesson) selectLesson(firstLesson, true);
    }
  }, [curriculum]);

  /** Returns the first incomplete lesson that blocks navigation to the target.
   *  A lesson is blocked if any lesson before it (in course order) is not completed. */
  const findBlocker = useCallback(
    (targetLesson: Lesson): Lesson | null => {
      if (!curriculum || !enrollment) return null;
      const completedSet = new Set(enrollment.completedLessons ?? []);
      const allFlat = curriculum.flatMap((s) => s.lessons ?? []);
      const targetIdx = allFlat.findIndex((l) => l._id === targetLesson._id);
      if (targetIdx <= 0) return null;

      for (let i = 0; i < targetIdx; i++) {
        if (!completedSet.has(allFlat[i]._id)) return allFlat[i];
      }
      return null;
    },
    [curriculum, enrollment],
  );

  const selectLesson = async (lesson: Lesson, skipGateCheck = false) => {
    if (!skipGateCheck) {
      const blocker = findBlocker(lesson);
      if (blocker) {
        const msg = blocker.type === 'quiz'
          ? `Trebuie să treci quiz-ul "${blocker.title}" cu minimum 90% pentru a continua.`
          : `Trebuie să finalizezi lecția "${blocker.title}" pentru a continua.`;
        toast.error(msg);
        return;
      }
    }

    setSelectedLesson(lesson);

    // Only fetch video URL for video lessons
    if (lesson.type === 'quiz' || !lesson.cdnVideoId || !course) {
      setVideoUrl('');
      return;
    }
    try {
      const { data } = await api.get(`/media/play-url/${lesson.cdnVideoId}`, {
        params: { courseId: course._id },
      });
      setVideoUrl(data.url);
    } catch {
      toast.error('Eroare la încărcarea videoclipului');
    }
  };

  // Mark lesson complete (for video lessons)
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

  // Called by QuizPlayer after a passing attempt
  const handleQuizPassed = () => {
    qc.invalidateQueries({ queryKey: ['progress', course?._id, user?._id] });
    qc.invalidateQueries({ queryKey: ['enrollments'] });
  };

  const completedIds = enrollment?.completedLessons ?? [];
  const allLessons = curriculum?.flatMap((s) => s.lessons) ?? [];
  const progress = allLessons.length > 0
    ? Math.round((completedIds.length / allLessons.length) * 100)
    : 0;

  const isQuiz = selectedLesson?.type === 'quiz';

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-64px)]">
      {/* Sidebar – curriculum */}
      <aside className="w-full lg:w-80 xl:w-96 border-r bg-white lg:overflow-y-auto flex-shrink-0">
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
                const isQuizLesson = lesson.type === 'quiz';

                // Check if this lesson is gated by any unfinished lesson before it
                const isGated = !isDone && !!findBlocker(lesson);

                return (
                  <button
                    key={lesson._id}
                    onClick={() => selectLesson(lesson)}
                    className={`w-full text-left flex items-center gap-3 p-3 pl-4 text-sm transition hover:bg-indigo-50 ${
                      isSelected ? 'bg-indigo-50 border-l-2 border-indigo-600' : ''
                    } ${isGated ? 'opacity-60' : ''}`}
                  >
                    {isDone ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : isGated ? (
                      <Lock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    ) : isQuizLesson ? (
                      <ClipboardList className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={isDone ? 'line-through text-gray-400' : ''}>
                      {lesson.title}
                    </span>
                    {isQuizLesson && !isDone && (
                      <span className="ml-auto text-xs text-indigo-400 flex-shrink-0 font-medium">Quiz</span>
                    )}
                    {!isQuizLesson && lesson.duration > 0 && (
                      <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                        {lesson.duration < 60
                          ? `${lesson.duration}s`
                          : `${Math.floor(lesson.duration / 60)}m${lesson.duration % 60 > 0 ? ` ${lesson.duration % 60}s` : ''}`}
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
      <div className="flex-1 lg:overflow-y-auto">
        {course && !course.published && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3 text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <span className="text-sm">Acest curs a fost retras de formator și nu mai primește actualizări. Îți păstrezi accesul la conținutul existent.</span>
          </div>
        )}
        {enrollment?.completedAt && (
          <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-3 text-green-800">
            <Trophy className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="font-semibold">Felicitări! Ai finalizat cursul.</span>
            <button
              disabled={downloadingCert}
              onClick={async () => {
                if (downloadingCert) return;
                setDownloadingCert(true);
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
                } finally {
                  setDownloadingCert(false);
                }
              }}
              className="ml-auto flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {downloadingCert ? 'Se generează...' : 'Descarcă certificatul'}
            </button>
          </div>
        )}
        <div className="p-4 md:p-8 max-w-4xl">
          {selectedLesson ? (
            <>
              {/* Quiz lesson */}
              {isQuiz ? (
                <>
                  <QuizPlayer
                    key={selectedLesson._id}
                    lesson={selectedLesson}
                    courseId={course?._id ?? ''}
                    onPassed={handleQuizPassed}
                  />
                  {(() => {
                    const flat = curriculum?.flatMap((s) => s.lessons) ?? [];
                    const idx = flat.findIndex((l) => l._id === selectedLesson._id);
                    const next = flat[idx + 1];
                    const currentDone = completedIds.includes(selectedLesson._id);
                    return next && currentDone ? (
                      <div className="mt-4">
                        <Button variant="ghost" onClick={() => selectLesson(next)}>
                          Lecția următoare <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    ) : null;
                  })()}
                </>
              ) : (
                /* Video lesson */
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
                      {/* Next lesson — only accessible after current lesson is completed */}
                      {(() => {
                        const flat = curriculum?.flatMap((s) => s.lessons) ?? [];
                        const idx = flat.findIndex((l) => l._id === selectedLesson._id);
                        const next = flat[idx + 1];
                        const currentDone = completedIds.includes(selectedLesson._id);
                        return next ? (
                          <Button
                            variant="ghost"
                            onClick={() => selectLesson(next)}
                            disabled={!currentDone}
                            title={!currentDone ? 'Finalizează lecția curentă pentru a continua' : undefined}
                          >
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
              )}
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
