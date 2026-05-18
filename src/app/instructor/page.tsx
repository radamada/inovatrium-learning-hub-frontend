'use client';

import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, TrendingUp, DollarSign, HelpCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface InstructorStats {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  uniqueStudents: number;
  totalRevenue: number;
}

interface MonthlyRevenue {
  month: string; // "YYYY-MM"
  revenue: number;
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ian', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'Mai', '06': 'Iun', '07': 'Iul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function formatMonth(ym: string) {
  const [year, month] = ym.split('-');
  return `${MONTH_LABELS[month]} ${year.slice(2)}`;
}

export default function InstructorDashboard() {
  const { data: stats, isLoading } = useQuery<InstructorStats>({
    queryKey: ['instructor-stats'],
    queryFn: () => api.get('/instructor/stats').then((r) => r.data),
  });

  const { data: monthly, isLoading: isLoadingChart } = useQuery<MonthlyRevenue[]>({
    queryKey: ['instructor-monthly-revenue'],
    queryFn: () => api.get('/instructor/stats/monthly-revenue').then((r) => r.data),
  });

  const chartData = monthly?.map((m) => ({
    name: formatMonth(m.month),
    revenue: m.revenue,
  }));

  const hasRevenue = chartData?.some((m) => m.revenue > 0);

  const cards = [
    {
      label: 'Cursuri totale',
      value: stats?.totalCourses ?? 0,
      sub: `${stats?.publishedCourses ?? 0} publicate`,
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      tooltip: 'Numărul total de cursuri create de tine, indiferent dacă sunt publicate sau draft.',
    },
    {
      label: 'Studenți unici',
      value: stats?.uniqueStudents ?? 0,
      sub: `${stats?.totalEnrollments ?? 0} înrolări totale`,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      tooltip: 'Numărul total de studenți care s-au înrolat în cursurile tale.',
    },
    {
      label: 'Venituri totale',
      value: `${(stats?.totalRevenue ?? 0).toFixed(2)} RON`,
      sub: 'din cursurile tale',
      icon: DollarSign,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      tooltip: 'Suma totală încasată din vânzările cursurilor tale (comenzi plătite).',
    },
    {
      label: 'Rată publicare',
      value: stats?.totalCourses
        ? `${Math.round((stats.publishedCourses / stats.totalCourses) * 100)}%`
        : '0%',
      sub: 'cursuri publicate',
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      tooltip: 'Procentul cursurilor tale care sunt active și vizibile în catalog față de total.',
    },
  ];

  return (
    <div>
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <h1 className="text-2xl font-bold text-gray-900">General</h1>
        <p className="text-gray-500 mt-1">Statisticile cursurilor tale</p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5 gap-6"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          : cards.map((card) => (
              <motion.div
                key={card.label}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                className="bg-white rounded-xl border p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <div className="relative group">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-400 cursor-help transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg leading-relaxed">
                        {card.tooltip}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                      </div>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </motion.div>
            ))}
      </motion.div>

      {/* Monthly revenue chart */}
      <motion.div
        className="mt-8 bg-white rounded-xl border p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
      >
        <h2 className="text-base font-semibold text-gray-900 mb-1">Venituri lunare</h2>
        <p className="text-xs text-gray-400 mb-6">Ultimele 12 luni (RON)</p>

        {isLoadingChart ? (
          <Skeleton className="h-56 w-full" />
        ) : !hasRevenue ? (
          <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
            Nu există vânzări în ultimele 12 luni.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v} RON`}
                width={70}
              />
              <Tooltip
                formatter={(value) => [typeof value === 'number' ? `${value.toFixed(2)} RON` : '0.00 RON', 'Venit']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                cursor={{ fill: '#f5f3ff' }}
              />
              <Bar dataKey="revenue" fill="#427AA1" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}
