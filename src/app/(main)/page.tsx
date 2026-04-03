'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Sparkles, Play, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import type { Course } from '@/types';
import CourseCard from '@/components/courses/CourseCard';
import CourseFilters from '@/components/courses/CourseFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';

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

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const cardStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export default function HomePage() {
  const { user } = useAuthStore();
  const { fetchCart } = useCartStore();

  const { data: stats } = useQuery<{ courses: number; students: number; instructors: number }>({
    queryKey: ['public-stats'],
    queryFn: () => api.get('/stats').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, category, level, sortBy]);

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

  const { data, isLoading } = useQuery({
    queryKey: ['courses', params],
    queryFn: () => api.get('/courses', { params }).then((r) => r.data),
  });

  useEffect(() => { if (user) fetchCart(); }, [user]);

  const courses: Course[] = data?.courses ?? [];
  const totalPages: number = data?.pages ?? 1;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="py-20 md:py-28 text-center px-4">
        <motion.div
          className="max-w-3xl mx-auto"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-full text-sm font-medium mb-8 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Platforma #1 de cursuri online din România
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6"
          >
            Învață de la{' '}
            <span className="text-indigo-600">cei mai buni</span>{' '}
            formatori
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto mb-10"
          >
            Accesează cursuri premium în programare, design, business și multe altele.
            Construiește-ți viitorul cu instrumente moderne.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 text-base rounded-xl shadow-md transition-colors"
              onClick={() => document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explorează cursurile
            </motion.button>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/cum-functioneaza"
                className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium px-8 py-3.5 text-base rounded-xl transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                Cum funcționează
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={stagger}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            {[
              { value: stats?.courses ?? '—', label: 'Cursuri' },
              { value: stats?.students ?? '—', label: 'Studenți' },
              { value: stats?.instructors ?? '—', label: 'Formatori' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(99,102,241,0.15)' }}
                className="bg-white border border-gray-200 rounded-2xl px-8 py-4 shadow-sm min-w-[110px] cursor-default"
              >
                <p className="text-2xl font-extrabold text-indigo-600">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Courses Section ── */}
      <section id="courses-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Section header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">TOP CURSURI</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Cursuri <span className="text-indigo-600">populare</span>
          </h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">
            Cele mai căutate cursuri de pe platformă, alese de comunitatea noastră.
          </p>
        </motion.div>

        <CourseFilters
          search={search}
          category={category}
          level={level}
          sortBy={sortBy}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onLevelChange={setLevel}
          onSortChange={setSortBy}
        />

        {data && (
          <p className="text-sm text-gray-500 mb-4">
            {data.total} {data.total === 1 ? 'curs găsit' : 'cursuri găsite'}
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-gray-400"
          >
            <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Niciun curs găsit pentru filtrele selectate.</p>
            <Button variant="outline" className="mt-4"
              onClick={() => { setSearch(''); setCategory('all'); setLevel('all'); }}>
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
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Înapoi</Button>
            <span className="flex items-center px-4 text-sm text-gray-500">Pagina {page} din {totalPages}</span>
            <Button variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Următor</Button>
          </div>
        )}

        {courses.length > 0 && (
          <div className="text-center mt-10">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              Vezi toate cursurile <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      {/* ── CTA Banner ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="bg-indigo-600 rounded-3xl px-8 py-14 text-center relative overflow-hidden"
        >
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-white/5 rounded-full" />
          <div className="relative">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-4xl mb-4"
            >
              🚀
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Pregătit să începi?</h2>
            <p className="text-indigo-100 text-lg mb-8 max-w-md mx-auto">
              Înscrie-te gratuit și accesează primele lecții din orice curs. Fără obligații.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-8 py-3.5 text-base rounded-xl transition-colors"
              >
                Creează cont gratuit <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
