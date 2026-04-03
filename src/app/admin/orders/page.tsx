'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Download, X } from 'lucide-react';

const statusLabel: Record<string, { label: string; class: string }> = {
  pending:   { label: 'În așteptare', class: 'bg-yellow-100 text-yellow-700' },
  paid:      { label: 'Plătit',       class: 'bg-green-100 text-green-700' },
  refunded:  { label: 'Rambursat',    class: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Anulat',       class: 'bg-red-100 text-red-600' },
};

const STATUSES = [
  { value: 'paid',      label: 'Plătit' },
  { value: 'refunded',  label: 'Rambursat' },
  { value: 'pending',   label: 'În așteptare' },
  { value: 'cancelled', label: 'Anulat' },
];

function exportCsv(orders: any[], hasFilters: boolean) {
  const rows = [
    ['Data', 'Student', 'Email Student', 'Cursuri', 'Instructor', 'Status', 'Total (RON)'],
    ...orders.map((o) => [
      format(new Date(o.createdAt), 'dd.MM.yyyy HH:mm'),
      o.userId?.name ?? '—',
      o.userId?.email ?? '',
      o.items.map((i: any) => i.title).join(' | '),
      [...new Set(o.items.map((i: any) => i.instructorName).filter(Boolean))].join(', '),
      statusLabel[o.status]?.label ?? o.status,
      (o.total ?? 0).toFixed(2),
    ]),
  ];
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comenzi-admin${hasFilters ? '-filtrat' : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrdersPage() {
  const qc = useQueryClient();

  const [page, setPage]                 = useState(1);
  const [status, setStatus]             = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [courseId, setCourseId]         = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');

  const setFilter = useCallback(
    (setter: (v: string) => void) => (v: string) => { setPage(1); setter(v); },
    [],
  );

  const buildParams = useCallback(
    (overrideLimit?: number) => {
      const p: Record<string, string | number> = { page, limit: overrideLimit ?? 20 };
      if (status)       p.status       = status;
      if (instructorId) p.instructorId = instructorId;
      if (courseId)     p.courseId     = courseId;
      if (dateFrom)     p.dateFrom     = dateFrom;
      if (dateTo)       p.dateTo       = dateTo;
      return p;
    },
    [page, status, instructorId, courseId, dateFrom, dateTo],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, status, instructorId, courseId, dateFrom, dateTo],
    queryFn: () => api.get('/admin/orders', { params: buildParams() }).then((r) => r.data),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: instructors = [] } = useQuery<any[]>({
    queryKey: ['admin-instructors-list'],
    queryFn: () => api.get('/admin/instructors').then((r) => r.data),
  });

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ['admin-courses-list', instructorId],
    queryFn: () =>
      api.get('/admin/courses-list', { params: instructorId ? { instructorId } : {} })
        .then((r) => r.data),
  });

  const refund = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/orders/${id}/refund`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Comanda a fost rambursată');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Eroare la rambursare'),
  });

  const orders = data?.orders ?? [];
  const total  = data?.total  ?? 0;
  const hasFilters = !!(status || instructorId || courseId || dateFrom || dateTo);

  function resetFilters() {
    setStatus(''); setInstructorId(''); setCourseId('');
    setDateFrom(''); setDateTo(''); setPage(1);
  }

  async function handleExportCsv() {
    const res = await api.get('/admin/orders', { params: buildParams(1000) });
    exportCsv(res.data.orders, hasFilters);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comenzi</h1>
          {total > 0 && (
            <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
              {total} {hasFilters ? 'filtrate' : 'total'}
            </p>
          )}
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          Export CSV{hasFilters ? ' (filtrat)' : ''}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4 mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Instructor */}
          <div className="flex-1">
            <Select
              value={instructorId}
              onValueChange={(v) => {
                setFilter(setInstructorId)(v as string);
                setFilter(setCourseId)('');
              }}
            >
              <SelectTrigger>
                <SelectValue>
                  {instructorId
                    ? (instructors.find((i: any) => i._id === instructorId)?.name ?? 'Instructor')
                    : 'Toți instructorii'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toți instructorii</SelectItem>
                {instructors.map((i: any) => (
                  <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Course */}
          <div className="flex-1">
            <Select value={courseId} onValueChange={setFilter(setCourseId) as any}>
              <SelectTrigger>
                <SelectValue>
                  {courseId
                    ? (courses.find((c: any) => c._id === courseId)?.title ?? 'Curs')
                    : 'Toate cursurile'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toate cursurile</SelectItem>
                {courses.map((c: any) => (
                  <SelectItem key={c._id} value={c._id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="w-full sm:w-44">
            <Select value={status} onValueChange={setFilter(setStatus) as any}>
              <SelectTrigger>
                <SelectValue placeholder="Toate statusurile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toate statusurile</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date range + reset */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">De la</label>
            <Input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} className="flex-1" />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">Până la</label>
            <Input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} className="flex-1" />
          </div>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors whitespace-nowrap px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <X className="w-3.5 h-3.5" /> Resetează filtre
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.length === 0 ? (
              <p className="text-center text-gray-400 dark:text-slate-500 py-12">
                {hasFilters ? 'Nicio comandă nu corespunde filtrelor.' : 'Nu există comenzi încă.'}
              </p>
            ) : orders.map((order: any) => {
              const s = statusLabel[order.status] ?? { label: order.status, class: '' };
              const isRefunded = order.status === 'refunded';
              const instructorNames = [...new Set(order.items.map((i: any) => i.instructorName).filter(Boolean))].join(', ');
              return (
                <div
                  key={order._id}
                  className={`rounded-xl border p-4 ${
                    isRefunded
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                      : 'bg-white dark:bg-slate-800 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{order.userId?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{order.userId?.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${s.class}`}>{s.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <ul className="space-y-0.5 flex-1 min-w-0 mr-2">
                      {order.items.map((item: any, i: number) => (
                        <li key={i} className="text-gray-700 dark:text-slate-300 truncate">{item.title}</li>
                      ))}
                    </ul>
                    <span className={`font-semibold flex-shrink-0 ${isRefunded ? 'text-red-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
                      {order.total.toFixed(2)} lei
                    </span>
                  </div>
                  {instructorNames && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">Instructor: {instructorNames}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      {format(new Date(order.createdAt), 'dd MMM yyyy HH:mm')}
                    </span>
                    {order.status === 'paid' && (
                      <Button
                        variant="outline" size="sm"
                        className="text-xs h-7 text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => { if (confirm('Ești sigur că vrei să rambursezi această comandă?')) refund.mutate(order._id); }}
                      >
                        Rambursare
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[750px]">
                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-400">Utilizator</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-400">Cursuri</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-400">Instructor</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-400">Total</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-400">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-slate-400">Data</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-slate-400">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {orders.map((order: any) => {
                    const s = statusLabel[order.status] ?? { label: order.status, class: '' };
                    const isRefunded = order.status === 'refunded';
                    const instructorNames = [...new Set(order.items.map((i: any) => i.instructorName).filter(Boolean))].join(', ');
                    return (
                      <tr
                        key={order._id}
                        className={`transition-colors ${
                          isRefunded
                            ? 'bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium dark:text-white">{order.userId?.name ?? '—'}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">{order.userId?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <ul className="space-y-0.5">
                            {order.items.map((item: any, i: number) => (
                              <li key={i} className="text-gray-700 dark:text-slate-300">{item.title}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400 text-xs">
                          {instructorNames || '—'}
                        </td>
                        <td className={`px-4 py-3 font-semibold ${isRefunded ? 'text-red-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
                          {order.total.toFixed(2)} lei
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-slate-500 text-xs">
                          {format(new Date(order.createdAt), 'dd MMM yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {order.status === 'paid' && (
                            <Button
                              variant="outline" size="sm"
                              className="text-xs h-7 text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => { if (confirm('Ești sigur că vrei să rambursezi această comandă?')) refund.mutate(order._id); }}
                            >
                              Rambursare
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-slate-500">
                        {hasFilters ? 'Nicio comandă nu corespunde filtrelor.' : 'Nu există comenzi încă.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pagination */}
      {data?.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Înapoi</Button>
          <span className="flex items-center px-3 text-sm text-gray-600 dark:text-slate-400">{page} / {data.pages}</span>
          <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage((p) => p + 1)}>Următor</Button>
        </div>
      )}
    </motion.div>
  );
}
