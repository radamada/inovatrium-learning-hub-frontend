'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import type { Course } from '@/types';
import CourseCard from '@/components/courses/CourseCard';
import CourseFilters from '@/components/courses/CourseFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';

function CourseCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200/60">
      <Skeleton className="h-44 w-full" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between mt-4">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}

const cardStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function CoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? 'all');
  const [level, setLevel] = useState(searchParams.get('level') ?? 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'newest');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '');
  const [minRating, setMinRating] = useState(searchParams.get('minRating') ?? '');
  const [instructorId, setInstructorId] = useState(searchParams.get('instructorId') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedMinPrice, setDebouncedMinPrice] = useState(minPrice);
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState(maxPrice);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedMinPrice(minPrice);
      setDebouncedMaxPrice(maxPrice);
    }, 600);
    return () => clearTimeout(t);
  }, [minPrice, maxPrice]);

  useEffect(() => setPage(1), [debouncedSearch, category, level, sortBy, debouncedMinPrice, debouncedMaxPrice, minRating, instructorId]);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (category !== 'all') params.set('category', category);
    if (level !== 'all') params.set('level', level);
    if (sortBy !== 'newest') params.set('sortBy', sortBy);
    if (debouncedMinPrice) params.set('minPrice', debouncedMinPrice);
    if (debouncedMaxPrice) params.set('maxPrice', debouncedMaxPrice);
    if (minRating) params.set('minRating', minRating);
    if (instructorId) params.set('instructorId', instructorId);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `/courses?${qs}` : '/courses', { scroll: false });
  }, [debouncedSearch, category, level, sortBy, debouncedMinPrice, debouncedMaxPrice, minRating, instructorId, page]);

  const { data: enrollments } = useQuery<string[]>({
    queryKey: ['enrollments-ids', user?._id],
    enabled: !!user,
    queryFn: () =>
      api.get('/enrollments').then((r) =>
        r.data
          .filter((e: any) => e.status !== 'refunded')
          .map((e: any) => e.courseId?._id ?? e.courseId),
      ),
  });

  const params: Record<string, string | number> = { page, limit: 12, sortBy };
  if (debouncedSearch) params.search = debouncedSearch;
  if (category !== 'all') params.category = category;
  if (level !== 'all') params.level = level;
  if (debouncedMinPrice) params.minPrice = debouncedMinPrice;
  if (debouncedMaxPrice) params.maxPrice = debouncedMaxPrice;
  if (minRating) params.minRating = minRating;
  if (instructorId) params.instructorId = instructorId;

  const { data, isLoading } = useQuery({
    queryKey: ['courses', params],
    queryFn: () => api.get('/courses', { params }).then((r) => r.data),
  });

  const courses: Course[] = data?.courses ?? [];
  const totalPages: number = data?.pages ?? 1;

  const hasFilters = !!(debouncedSearch || category !== 'all' || level !== 'all' || debouncedMinPrice || debouncedMaxPrice || minRating || instructorId);

  function resetFilters() {
    setSearch('');
    setCategory('all');
    setLevel('all');
    setSortBy('newest');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setInstructorId('');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Toate cursurile</h1>
        <p className="text-gray-500">Explorează colecția completă de cursuri de pe platformă.</p>
      </div>

      <CourseFilters
        search={search}
        category={category}
        level={level}
        sortBy={sortBy}
        minPrice={minPrice}
        maxPrice={maxPrice}
        minRating={minRating}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onLevelChange={setLevel}
        onSortChange={setSortBy}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
        onMinRatingChange={setMinRating}
        instructorId={instructorId}
        onInstructorChange={setInstructorId}
        showAdvanced={!!(searchParams.get('minPrice') || searchParams.get('maxPrice') || searchParams.get('minRating') || searchParams.get('instructorId'))}
      />

      {data && (
        <p className="text-sm text-gray-500 mb-4">
          {data.total} {data.total === 1 ? 'curs găsit' : 'cursuri găsite'}
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-3 text-indigo-600 hover:underline"
            >
              Resetează filtrele
            </button>
          )}
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, i) => <CourseCardSkeleton key={i} />)}
        </div>
      ) : courses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24 text-gray-400"
        >
          <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-gray-500 mb-1">Niciun curs găsit</p>
          <p className="text-sm text-gray-400 mb-6">Încearcă să modifici filtrele sau caută altceva.</p>
          <Button variant="outline" onClick={resetFilters}>
            Resetează filtrele
          </Button>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={cardStagger}
          initial="hidden"
          animate="show"
          key={JSON.stringify(params)}
        >
          {courses.map((course, idx) => (
            <motion.div key={course._id} variants={cardItem}>
              <CourseCard
                course={course}
                isEnrolled={enrollments?.includes(course._id) ?? false}
                priority={idx === 0}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Înapoi
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="flex items-center px-2 text-gray-400">…</span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  onClick={() => setPage(p as number)}
                  className="w-10"
                >
                  {p}
                </Button>
              )
            )}
          <Button variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Următor
          </Button>
        </div>
      )}
    </div>
  );
}
