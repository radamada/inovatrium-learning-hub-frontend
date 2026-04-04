'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, ShoppingBag, TrendingUp, GraduationCap, BookMarked, UserCheck, HelpCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { motion } from 'framer-motion';

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ian', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'Mai', '06': 'Iun', '07': 'Iul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

export default function AdminDashboardPage() {
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
  });

  const { data: monthlyRevenue } = useQuery<{ month: string; revenue: number }[]>({
    queryKey: ['admin-monthly-revenue'],
    queryFn: () => api.get('/admin/stats/monthly-revenue').then((r) => r.data),
  });

  const { data: instructors } = useQuery<{ _id: string; name: string; email: string }[]>({
    queryKey: ['admin-instructors'],
    queryFn: () => api.get('/admin/instructors').then((r) => r.data),
  });

  const { data: instrStats, isLoading: instrStatsLoading } = useQuery({
    queryKey: ['admin-instructor-stats', selectedInstructorId],
    queryFn: () => api.get(`/admin/instructors/${selectedInstructorId}/stats`).then((r) => r.data),
    enabled: !!selectedInstructorId,
  });

  const { data: instrRevenue } = useQuery<{ month: string; revenue: number }[]>({
    queryKey: ['admin-instructor-revenue', selectedInstructorId],
    queryFn: () => api.get(`/admin/instructors/${selectedInstructorId}/monthly-revenue`).then((r) => r.data),
    enabled: !!selectedInstructorId,
  });

  const chartData = (monthlyRevenue ?? []).map((m) => ({
    luna: MONTH_LABELS[m.month.slice(5)] ?? m.month,
    venituri: m.revenue,
  }));

  const instrChartData = (instrRevenue ?? []).map((m) => ({
    luna: MONTH_LABELS[m.month.slice(5)] ?? m.month,
    venituri: m.revenue,
  }));

  const selectedInstructor = instructors?.find((i) => i._id === selectedInstructorId);

  const statCards = [
    {
      label: 'Utilizatori',
      value: stats?.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      tooltip: 'Numărul total de conturi înregistrate pe platformă, indiferent de rol (studenți, formatori, admini).',
    },
    {
      label: 'Cursuri',
      value: stats?.totalCourses,
      icon: BookOpen,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      tooltip: 'Numărul total de cursuri existente pe platformă, inclusiv cele în draft (nepublicate).',
    },
    {
      label: 'Studenți unici',
      value: stats?.uniqueStudents,
      sub: stats?.totalEnrollments != null ? `${stats.totalEnrollments} înrolări` : undefined,
      icon: GraduationCap,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      tooltip: 'Numărul de utilizatori distincți care au cel puțin o înrolare activă. O persoană înrolată la 3 cursuri contează o singură dată. Subtextul arată totalul înrolărilor active.',
    },
    {
      label: 'Comenzi plătite',
      value: stats?.totalOrders,
      icon: ShoppingBag,
      color: 'text-green-600',
      bg: 'bg-green-50',
      tooltip: 'Numărul total de comenzi cu statusul "plătit". Nu include comenzile anulate, în așteptare sau rambursate.',
    },
    {
      label: 'Venituri totale (lei)',
      value: stats?.totalRevenue ? stats.totalRevenue.toFixed(2) : '–',
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      tooltip: 'Suma totală a tuturor comenzilor plătite, din toată istoria platformei. Comenzile rambursate nu sunt incluse în acest calcul.',
    },
  ];

  const instrStatCards = instrStats ? [
    {
      label: 'Cursuri totale',
      value: instrStats.totalCourses,
      sub: `${instrStats.publishedCourses} publicate`,
      icon: BookMarked,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      tooltip: 'Numărul total de cursuri create de acest formator, inclusiv draft-urile. Subtextul arată câte sunt publicate și vizibile studenților.',
    },
    {
      label: 'Studenți unici',
      value: instrStats.uniqueStudents,
      sub: `${instrStats.totalEnrollments} înrolări totale`,
      icon: UserCheck,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      tooltip: 'Numărul de studenți distincți înrolați la cel puțin un curs al acestui formator. Subtextul arată totalul înrolărilor (un student la 2 cursuri = 2 înrolări).',
    },
    {
      label: 'Venituri totale (lei)',
      value: instrStats.totalRevenue?.toFixed(2) ?? '0.00',
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      tooltip: 'Suma totală generată din vânzările cursurilor acestui formator (doar comenzi plătite, fără rambursări). Aceasta este suma brută înainte de orice comision al platformei.',
    },
  ] : [];

  return (
    <div>
      <motion.h1
        className="text-2xl font-bold mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        General
      </motion.h1>

      {/* Stat cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-5"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      >
        {statCards.map((card) => (
          <motion.div
            key={card.label}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
            className="bg-white rounded-xl border p-3 flex items-center gap-3"
          >
            <div className={`p-2 rounded-lg flex-shrink-0 ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-xl font-bold leading-tight">{card.value ?? 0}</p>
                )}
                <Tooltip content={card.tooltip}>
                  <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help flex-shrink-0 transition-colors" />
                </Tooltip>
              </div>
              <p className="text-xs text-gray-500">{card.label}</p>
              {'sub' in card && card.sub && (
                <p className="text-xs text-gray-400">{card.sub}</p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Platform revenue chart */}
      <motion.div
        className="bg-white rounded-xl border p-4 mb-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold">Venituri platformă — ultimele 12 luni</h2>
          <Tooltip content="Suma totală a comenzilor plătite pentru fiecare lună din ultimele 12 luni. Include veniturile din toate cursurile și toți formatorii. Rambursările nu sunt incluse.">
            <HelpCircle className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-help transition-colors" />
          </Tooltip>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="luna" tick={{ fontSize: 9 }} interval={0} />
            <YAxis tick={{ fontSize: 10 }} />
            <RechartsTooltip formatter={(v: any) => `${typeof v === 'number' ? v.toFixed(2) : v} lei`} />
            <Bar dataKey="venituri" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Instructor stats section */}
      <motion.div
        className="bg-white rounded-xl border p-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
      >
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="font-bold text-gray-900">Statistici per formator</h2>
            <Tooltip content="Selectează un formator din lista de mai jos pentru a vedea performanța lui individuală: cursuri, studenți și venituri generate.">
              <HelpCircle className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-help transition-colors" />
            </Tooltip>
          </div>
          <p className="text-sm text-gray-400 mb-3">Selectează un formator pentru a vedea performanța lui</p>
          <select
            value={selectedInstructorId}
            onChange={(e) => setSelectedInstructorId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">— Selectează formator —</option>
            {(instructors ?? []).map((i) => (
              <option key={i._id} value={i._id}>{i.name}</option>
            ))}
          </select>
        </div>

        {!selectedInstructorId ? (
          <div className="text-center py-12 text-gray-300">
            <Users className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm">Niciun formator selectat</p>
          </div>
        ) : instrStatsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-indigo-700 mb-4">
              {selectedInstructor?.name}
              <span className="text-gray-400 font-normal ml-2">{selectedInstructor?.email}</span>
            </p>

            {/* Instructor stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {instrStatCards.map((card) => (
                <div key={card.label} className="border rounded-xl p-4 flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg flex-shrink-0 ${card.bg}`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-lg font-bold leading-tight">{card.value ?? 0}</p>
                      <Tooltip content={card.tooltip}>
                        <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help flex-shrink-0 transition-colors" />
                      </Tooltip>
                    </div>
                    <p className="text-xs text-gray-500">{card.label}</p>
                    {'sub' in card && (card as any).sub && (
                      <p className="text-xs text-gray-400">{(card as any).sub}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Instructor revenue chart */}
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-600">Venituri — ultimele 12 luni</h3>
              <Tooltip content="Veniturile lunare generate exclusiv din cursurile acestui formator. Lunile fără vânzări apar cu valoarea 0.">
                <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help transition-colors" />
              </Tooltip>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={instrChartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="luna" tick={{ fontSize: 9 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <RechartsTooltip formatter={(v: any) => `${typeof v === 'number' ? v.toFixed(2) : v} lei`} />
                <Bar dataKey="venituri" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </motion.div>
    </div>
  );
}
