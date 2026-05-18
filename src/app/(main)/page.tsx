'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Sparkles, HelpCircle, ArrowRight, Check } from 'lucide-react';
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
    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-200/60 dark:border-slate-700">
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

// Hero children start immediately at the "show" state — no opacity-0 flash on hydration.
const heroStagger = {
  show: { transition: { staggerChildren: 0.12 } },
};

const heroItem = {
  show: { opacity: 1, y: 0 },
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
          variants={heroStagger}
          initial="show"
          animate="show"
        >
          {/* Badge */}
          <motion.div
            variants={heroItem}
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 px-4 py-2 rounded-full text-sm font-medium mb-8 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Locul unde expertiza întâlnește curiozitatea
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={heroItem}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-slate-100 leading-tight mb-6"
          >
            Învață de la{' '}
            <span className="text-blue-600 dark:text-blue-400">formatori de top verificați</span>
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="text-gray-500 dark:text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10"
          >
            Învață în ritmul tău, de la formatori cu experiență verificată.
            Cursuri bine structurate care îți deschid noi oportunități.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={heroItem}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3.5 text-base rounded-xl shadow-md transition-colors"
              onClick={() => document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explorează cursurile
            </motion.button>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/cum-functioneaza"
                className="flex items-center gap-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium px-8 py-3.5 text-base rounded-xl transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                Cum funcționează
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={heroItem} className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { value: stats?.courses, label: 'cursuri disponibile' },
              { value: stats?.instructors, label: 'formatori verificați' },
            ].map((stat, i) => (
              <span key={stat.label} className="flex items-center gap-3">
                {i > 0 && <span className="text-gray-300 dark:text-slate-600 text-lg select-none">·</span>}
                <span className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums leading-none">
                    {stat.value != null ? `${stat.value}+` : '—'}
                  </span>
                  <span className="text-base text-gray-500 dark:text-slate-400 font-medium">{stat.label}</span>
                </span>
              </span>
            ))}
          </motion.div>

          {/* Value props */}
          <motion.div variants={heroItem} className="flex items-center justify-center gap-5 flex-wrap mt-3">
            {['100% online', 'Acces nelimitat', 'Certificate incluse'].map((prop) => (
              <span key={prop} className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-slate-500">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                {prop}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Courses Section ── */}
      <div className="bg-slate-50 dark:bg-slate-800/50">
        <section id="courses-section" className="max-w-7xl 3xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Section header */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400 mb-3">TOP CURSURI</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-slate-100">
              Cursuri <span className="text-blue-600 dark:text-blue-400">populare</span>
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mt-3 max-w-lg mx-auto">
              Cele mai îndrăgite cursuri de pe platformă, alese de comunitatea noastră.
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
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              {data.total} {data.total === 1 ? 'curs găsit' : 'cursuri găsite'}
            </p>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
            </div>
          ) : courses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 text-gray-400 dark:text-slate-500"
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
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 gap-6"
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
              <span className="flex items-center px-4 text-sm text-gray-500 dark:text-slate-400">Pagina {page} din {totalPages}</span>
              <Button variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Următor</Button>
            </div>
          )}

          {courses.length > 0 && (
            <div className="text-center mt-10">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                Vezi toate cursurile <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* ── CTA Banner ── */}
      <section className="max-w-7xl 3xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl px-8 py-14 text-center relative overflow-hidden"
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
            <p className="text-emerald-100 text-lg mb-8 max-w-md mx-auto">
              Înscrie-te gratuit și începe să înveți chiar acum.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-8 py-3.5 text-base rounded-xl transition-colors"
              >
                Creează un cont gratuit <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
