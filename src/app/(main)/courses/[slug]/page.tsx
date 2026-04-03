'use client';

import { use, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Users, BookOpen, Clock, ChevronDown, ChevronRight, Lock, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import type { Course, Section, Review, Lesson } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import VideoPlayer from '@/components/player/VideoPlayer';

export default function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuthStore();
  const { addItem, items } = useCartStore();
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const openPreview = async (lesson: Lesson) => {
    if (!lesson.cdnVideoId) {
      toast.error('Această lecție nu are video disponibil');
      return;
    }
    try {
      const { data } = await api.get(`/media/preview-url/${lesson.cdnVideoId}`);
      setPreviewUrl(data.url);
      setPreviewLesson(lesson);
    } catch {
      toast.error('Nu s-a putut încărca preview-ul');
    }
  };

  const closePreview = () => {
    setPreviewLesson(null);
    setPreviewUrl('');
  };

  useEffect(() => {
    if (!previewLesson) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePreview(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [previewLesson]);

  const { data: course, isLoading } = useQuery<Course>({
    queryKey: ['course', slug],
    queryFn: () => api.get(`/courses/${slug}`).then((r) => r.data),
  });

  const { data: curriculum } = useQuery<Section[]>({
    queryKey: ['curriculum', course?._id],
    enabled: !!course,
    queryFn: () => api.get(`/courses/${course!._id}/curriculum`).then((r) => r.data),
  });

  const { data: isEnrolled } = useQuery<boolean>({
    queryKey: ['enrolled', course?._id, user?._id],
    enabled: !!user && !!course,
    queryFn: () =>
      api.get(`/enrollments/check/${course!._id}`).then((r) => r.data.enrolled),
  });

  const qc = useQueryClient();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const { data: alsoBought } = useQuery<Course[]>({
    queryKey: ['also-bought', course?._id],
    enabled: !!course,
    queryFn: () => api.get(`/courses/${course!._id}/also-bought`).then((r) => r.data),
  });

  const { data: reviewsData } = useQuery<{ reviews: Review[]; total: number }>({
    queryKey: ['reviews', course?._id],
    enabled: !!course,
    queryFn: () => api.get(`/reviews/${course!._id}`).then((r) => r.data),
  });
  const reviews = reviewsData?.reviews;

  const submitReview = useMutation({
    mutationFn: () =>
      api.post(`/reviews/${course!._id}`, { rating: reviewRating, comment: reviewComment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', course?._id] });
      qc.invalidateQueries({ queryKey: ['course', slug] });
      setReviewComment('');
      setReviewRating(5);
      toast.success('Recenzia a fost trimisă!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Eroare la trimiterea recenziei'),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!course) return <div className="text-center py-20">Cursul nu a fost găsit.</div>;

  const inCart = items.some((i) => i._id === course._id);

  const totalLessons = curriculum?.reduce((s, sec) => s + sec.lessons.length, 0) ?? 0;
  const totalDuration = curriculum
    ?.flatMap((s) => s.lessons)
    .reduce((s, l) => s + l.duration, 0) ?? 0;
  const totalHours = Math.floor(totalDuration / 3600);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddToCart = async () => {
    if (!user) { router.push('/login'); return; }
    if (isAddingToCart) return;
    setIsAddingToCart(true);
    try {
      await addItem(course._id);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {course.categoryId && (
            <Badge className="mb-3">{course.categoryId.name}</Badge>
          )}
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">{course.title}</h1>
          <p className="text-gray-600 mb-4">{course.description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              {course.rating.toFixed(1)} ({course.reviewCount} recenzii)
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" /> {Math.max(0, course.enrollmentCount)} studenți
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" /> {totalLessons} lecții
            </span>
            {totalHours > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {totalHours}h conținut
              </span>
            )}
            {course.level && (
              <Badge variant="outline">{{ beginner: 'Începător', intermediate: 'Intermediar', advanced: 'Avansat' }[course.level] ?? course.level}</Badge>
            )}
          </div>

          {/* What you'll learn */}
          {course.whatYouLearn.length > 0 && (
            <div className="bg-indigo-50 rounded-xl p-5 mb-6">
              <h2 className="font-bold text-lg mb-3">Ce vei învăța</h2>
              <ul className="grid sm:grid-cols-2 gap-2">
                {course.whatYouLearn.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Curriculum */}
          {curriculum && curriculum.length > 0 && (
            <div className="mb-6">
              <h2 className="font-bold text-xl mb-4">Curriculum</h2>
              <div className="border rounded-xl overflow-hidden">
                {curriculum.map((section) => (
                  <div key={section._id} className="border-b last:border-b-0">
                    <button
                      className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition text-left"
                      onClick={() => toggleSection(section._id)}
                    >
                      <span className="font-semibold">{section.title}</span>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{section.lessons.length} lecții</span>
                        {expandedSections.has(section._id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                    {expandedSections.has(section._id) && (
                      <div className="divide-y">
                        {section.lessons.map((lesson) => (
                          <div
                            key={lesson._id}
                            className={`flex items-center gap-3 p-3 pl-6 text-sm ${lesson.isFree ? 'cursor-pointer hover:bg-indigo-50 transition-colors' : ''}`}
                            onClick={lesson.isFree ? () => openPreview(lesson) : undefined}
                          >
                            {lesson.isFree ? (
                              <Play className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            ) : (
                              <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <span className={lesson.isFree ? 'text-indigo-600' : 'text-gray-700'}>
                              {lesson.title}
                            </span>
                            {lesson.isFree && (
                              <Badge variant="outline" className="text-xs ml-auto">Previzualizare</Badge>
                            )}
                            {lesson.duration > 0 && (
                              <span className="text-gray-400 ml-auto">
                                {Math.floor(lesson.duration / 60)}:{String(lesson.duration % 60).padStart(2, '0')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Reviews */}
          <div className="mb-6">
            <h2 className="font-bold text-xl mb-4">
              Recenzii ({reviews?.length ?? 0})
            </h2>

            {/* Write review — enrolled users only */}
            {isEnrolled && (
              <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                <p className="font-semibold text-sm mb-3">Lasă o recenzie</p>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setReviewRating(s)}
                      className="focus:outline-none"
                      aria-label={`${s} ${s === 1 ? 'stea' : 'stele'}`}
                      aria-pressed={s <= reviewRating}
                    >
                      <Star
                        className={`w-6 h-6 ${
                          s <= reviewRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Împărtășește experiența ta cu acest curs..."
                  rows={3}
                  className="mb-3 bg-white"
                />
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={!reviewComment.trim() || submitReview.isPending}
                  onClick={() => submitReview.mutate()}
                >
                  {submitReview.isPending ? 'Se trimite...' : 'Trimite recenzia'}
                </Button>
              </div>
            )}

            {/* Reviews list */}
            <div className="space-y-4">
              {reviews?.map((review) => (
                <div key={review._id} className="border rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                      {review.userId.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{review.userId.name}</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString('ro-RO')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                </div>
              ))}
              {reviews?.length === 0 && (
                <p className="text-gray-400 text-sm">
                  Nu există recenzii încă. {isEnrolled ? 'Fii primul!' : 'Cumpără cursul pentru a lăsa o recenzie.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sticky purchase card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white border rounded-2xl shadow-lg overflow-hidden">
            {course.thumbnail && (
              <div className="relative aspect-video">
                <Image src={course.thumbnail} alt={course.title} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover object-left-top" priority />
              </div>
            )}
            <div className="p-5">
              <div className="text-3xl font-extrabold text-indigo-700 mb-4">
                {course.price.toFixed(2)} lei
              </div>
              {isEnrolled ? (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 mb-3"
                  render={<Link href={`/courses/${course.slug}/learn`} />}
                >
                  ▶ Accesează cursul
                </Button>
              ) : inCart ? (
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 mb-3"
                  render={<Link href="/checkout" />}
                >
                  Finalizează comanda
                </Button>
              ) : (
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 mb-3"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                >
                  {isAddingToCart ? 'Se adaugă...' : 'Adaugă în coș'}
                </Button>
              )}
              <p className="text-xs text-gray-400 text-center">
                Acces nelimitat după cumpărare
              </p>
              <div className="mt-4 border-t pt-4 text-sm text-gray-600 space-y-2">
                <p>
                  <strong>Formator:</strong>{' '}
                  {course.instructorId?._id ? (
                    <Link
                      href={`/instructors/${course.instructorId._id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {course.instructorId.name}
                    </Link>
                  ) : (
                    course.instructorId?.name
                  )}
                </p>
                {course.language && <p><strong>Limbă:</strong> {course.language.toUpperCase()}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Also bought */}
      {alsoBought && alsoBought.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Studenții care au cumpărat asta au mai cumpărat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {alsoBought.map((c) => (
              <Link key={c._id} href={`/courses/${c.slug}`} className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition group">
                {c.thumbnail && (
                  <div className="relative h-36">
                    <Image src={c.thumbnail} alt={c.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-semibold text-sm line-clamp-2">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{(c.instructorId as any)?.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    {c.rating > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <Star className="w-3 h-3 fill-amber-400" /> {c.rating.toFixed(1)}
                      </span>
                    )}
                    <span className="text-sm font-bold text-indigo-700 ml-auto">{c.price.toFixed(2)} lei</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Preview video modal */}
      {previewLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closePreview}
        >
          <div
            className="relative w-full max-w-3xl bg-black rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
              <p className="text-white font-medium text-sm truncate">{previewLesson.title}</p>
              <button onClick={closePreview} className="text-gray-400 hover:text-white ml-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded" aria-label="Închide previzualizare">
                <X className="w-5 h-5" />
              </button>
            </div>
            {previewUrl ? (
              <VideoPlayer src={previewUrl} />
            ) : (
              <div className="aspect-video flex items-center justify-center text-gray-400">
                Se încarcă...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
