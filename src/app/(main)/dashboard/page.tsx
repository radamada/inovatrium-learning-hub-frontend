'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, CheckCircle, GraduationCap, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Enrollment } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user, isHydrated } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [downloadingCerts, setDownloadingCerts] = useState<Set<string>>(new Set());
  // Guards against React 18 StrictMode double-invoking the effect in dev,
  // which otherwise stacks two identical "Plată reușită" toasts.
  const successToastShown = useRef(false);

  useEffect(() => {
    if (!isHydrated) return; // Wait for Zustand to rehydrate from localStorage
    if (!user) { router.push('/login?from=/dashboard'); return; }
    if (searchParams.get('success') === '1' && !successToastShown.current) {
      successToastShown.current = true;
      toast.success('🎉 Plată reușită! Cursurile sunt acum disponibile.');
      router.replace('/dashboard', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isHydrated, searchParams]);

  const { data: enrollments, isLoading } = useQuery<Enrollment[]>({
    queryKey: ['enrollments', user?._id],
    enabled: !!user,
    queryFn: () => api.get('/enrollments').then((r) => r.data),
  });

  // Fetch total lesson counts for each enrolled course
  const courseIds: string[] = enrollments
    ? enrollments.map((e) => (e.courseId as any)?._id).filter(Boolean)
    : [];

  const { data: curriculaMap } = useQuery<Record<string, number>>({
    queryKey: ['curricula-totals', courseIds.join(',')],
    enabled: courseIds.length > 0,
    queryFn: () => api.post('/courses/lesson-counts', { courseIds }).then((r) => r.data),
  });

  if (!user) return null;

  return (
    <div className="max-w-6xl 3xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="text-blue-600" />
          Cursurile mele
        </h1>
        <p className="text-gray-500 mt-1">
          Bine ai venit, <strong>{user.name}</strong>! Continuă de unde ai rămas.
        </p>
      </motion.div>

      {/* Stats */}
      {enrollments && (
        <motion.div
          className="grid grid-cols-3 gap-3 mb-8"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >
          {[
            {
              label: 'Achiziționate',
              value: enrollments.filter((e) => e.status !== 'refunded').length,
              icon: BookOpen,
            },
            {
              label: 'Active',
              value: enrollments.filter((e) => e.status !== 'refunded' && !e.completedAt).length,
              icon: CheckCircle,
            },
            {
              label: 'Completate',
              value: enrollments.filter((e) => e.status !== 'refunded' && !!e.completedAt).length,
              icon: Award,
            },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
              className="bg-white rounded-xl border p-3 flex flex-col items-center text-center gap-1 sm:flex-row sm:items-center sm:text-left sm:gap-3 sm:p-4"
            >
              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold leading-none">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Enrollments grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : !enrollments || enrollments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 text-gray-400"
        >
          <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg mb-4">Nu ai cumpărat încă niciun curs.</p>
          <Button render={<Link href="/" />} className="bg-blue-600 hover:bg-blue-700">
            Explorează cursuri
          </Button>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 gap-6"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {enrollments.map((enrollment) => {
            const course = enrollment.courseId as any;
            const completed = enrollment.completedLessons.length;
            const courseId = course?._id;
            const total = curriculaMap?.[courseId] ?? 0;
            const isOwned = !enrollment.orderId;
            const progressValue = enrollment.completedAt
              ? 100
              : total > 0
              ? Math.round((completed / total) * 100)
              : 0;

            const statusBadge = enrollment.status === 'refunded'
              ? { label: 'Rambursat', cls: 'bg-red-500 text-white' }
              : isOwned
              ? { label: 'Curs propriu', cls: 'bg-blue-600 text-white' }
              : enrollment.completedAt
              ? { label: '✓ Finalizat', cls: 'bg-green-600 text-white' }
              : { label: '✓ Acces complet', cls: 'bg-green-500 text-white' };

            return (
              <motion.div
                key={enrollment._id}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } } }}
              >
                <Link href={`/courses/${course?.slug}/learn`} className="group block">
                  <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200/60 dark:ring-slate-600/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full transform-gpu">
                    {/* Thumbnail */}
                    <div className="relative h-48 sm:h-52 bg-blue-50/60 overflow-hidden">
                      {course?.thumbnail ? (
                        <Image
                          src={course.thumbnail}
                          alt={course?.title ?? ''}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center">
                          <BookOpen className="w-14 h-14 text-blue-200" />
                        </div>
                      )}

                      {/* Status badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </span>
                      </div>

                      {/* Level badge */}
                      {course?.level && (
                        <div className="absolute top-3 left-3">
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm ${
                            course.level === 'beginner' ? 'bg-emerald-600 text-white'
                            : course.level === 'intermediate' ? 'bg-blue-600 text-white'
                            : course.level === 'advanced' ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-white'
                          }`}>
                            {course.level === 'beginner' ? 'Începător' : course.level === 'intermediate' ? 'Intermediar' : course.level === 'advanced' ? 'Avansat' : course.level}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="px-5 pt-5 pb-5 flex flex-col flex-1">
                      {/* Category */}
                      {course?.categoryId?.name && (
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 mb-2">
                          {course.categoryId.name}
                        </p>
                      )}

                      {/* Title */}
                      <h3 className="font-bold text-[17px] leading-snug text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-3 min-h-[3rem]">
                        {course?.title}
                      </h3>

                      {/* Instructor */}
                      <div className="flex items-center gap-2.5 min-w-0 mb-3">
                          {course?.instructorId?.avatar ? (
                            <Image
                              src={course.instructorId.avatar}
                              alt={course.instructorId.name}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                              {course?.instructorId?.name?.charAt(0)?.toUpperCase() ?? 'F'}
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {course?.instructorId?.name ?? 'Formator'}
                          </span>
                        </div>

                      {/* Divider + Progress + Actions */}
                      <div className="border-t border-gray-100 mt-auto pt-4">
                        {/* Progress */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className={enrollment.completedAt ? 'text-green-600 font-medium flex items-center gap-1' : 'text-gray-500'}>
                              {enrollment.completedAt && <CheckCircle className="w-3.5 h-3.5" />}
                              {enrollment.completedAt ? 'Finalizat' : completed > 0 ? 'Progres' : 'Nepornit'}
                            </span>
                            <span className={enrollment.completedAt ? 'text-green-600 font-medium' : 'text-gray-500'}>
                              {enrollment.completedAt
                                ? `${total || completed} / ${total || completed} lecții`
                                : `${completed}${total ? ` / ${total}` : ''} lecții`}
                            </span>
                          </div>
                          <Progress
                            value={progressValue}
                            className={`h-1.5 ${enrollment.completedAt ? '[&>div]:bg-green-500' : ''}`}
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2">
                          <span
                            className="w-full text-center text-sm font-semibold py-2 rounded-lg transition-colors bg-blue-600 text-white group-hover:bg-blue-700"
                          >
                            {enrollment.status === 'refunded' && !isOwned
                              ? 'Cumpără din nou'
                              : enrollment.completedAt
                              ? 'Revizuiește'
                              : completed > 0
                              ? 'Continuă'
                              : 'Începe'}
                          </span>
                          {enrollment.completedAt && (
                            <button
                              disabled={downloadingCerts.has(courseId)}
                              onClick={async (e) => {
                                e.preventDefault();
                                if (downloadingCerts.has(courseId)) return;
                                setDownloadingCerts((prev) => new Set(prev).add(courseId));
                                try {
                                  const res = await api.get(`/enrollments/${courseId}/certificate`, { responseType: 'blob' });
                                  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `certificat-${course?.slug}.pdf`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                } catch {
                                  toast.error('Nu s-a putut genera certificatul');
                                } finally {
                                  setDownloadingCerts((prev) => { const s = new Set(prev); s.delete(courseId); return s; });
                                }
                              }}
                              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 rounded-lg py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <Award className="w-3.5 h-3.5" /> {downloadingCerts.has(courseId) ? 'Se generează...' : 'Descarcă certificat'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
