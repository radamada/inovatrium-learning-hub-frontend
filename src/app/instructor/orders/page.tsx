'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Download, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { motion } from 'framer-motion';

const statusLabel: Record<string, { label: string; class: string }> = {
  paid:      { label: 'Plătit',        class: 'bg-green-100 text-green-700' },
  refunded:  { label: 'Rambursat',     class: 'bg-red-100 text-red-600' },
  pending:   { label: 'În așteptare',  class: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: 'Anulat',        class: 'bg-red-100 text-red-600' },
};

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visibleLocal = local.slice(0, Math.min(3, local.length));
  const starsLocal = '*'.repeat(Math.max(3, local.length - visibleLocal.length));
  const dotIndex = domain.lastIndexOf('.');
  const domainName = dotIndex > 0 ? domain.slice(0, dotIndex) : domain;
  const tld = dotIndex > 0 ? domain.slice(dotIndex) : '';
  const visibleDomain = domainName.slice(0, Math.min(2, domainName.length));
  const starsDomain = '*'.repeat(Math.max(3, domainName.length - visibleDomain.length));
  return `${visibleLocal}${starsLocal}@${visibleDomain}${starsDomain}${tld}`;
}

function exportCsv(orders: any[], hasFilters: boolean) {
  const totalRevenue = orders.reduce((sum, o) => sum + (o.myRevenue ?? 0), 0);
  const rows = [
    ['Data', 'Student', 'Email', 'Cursuri', 'Status', 'Venit (RON)'],
    ...orders.map((o) => [
      new Date(o.createdAt).toLocaleDateString('ro-RO'),
      o.userId?.name ?? 'Student',
      o.userId?.email ? maskEmail(o.userId.email) : '',
      o.items.map((i: any) => i.title).join(' | '),
      statusLabel[o.status]?.label ?? o.status,
      (o.myRevenue ?? 0).toFixed(2),
    ]),
    [],
    ['', '', '', '', `TOTAL (${orders.length} comenzi)`, totalRevenue.toFixed(2)],
  ];
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comenzi${hasFilters ? '-filtrat' : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUSES = [
  { value: 'paid',      label: 'Plătit' },
  { value: 'refunded',  label: 'Rambursat' },
  { value: 'pending',   label: 'În așteptare' },
  { value: 'cancelled', label: 'Anulat' },
];

export default function InstructorOrdersPage() {
  const [status, setStatus]     = useState('');
  const [courseId, setCourseId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const buildParams = useCallback(() => {
    const p: Record<string, string> = { limit: '200' };
    if (status)   p.status   = status;
    if (courseId) p.courseId = courseId;
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo)   p.dateTo   = dateTo;
    return p;
  }, [status, courseId, dateFrom, dateTo]);

  const { data, isLoading } = useQuery({
    queryKey: ['instructor-orders', status, courseId, dateFrom, dateTo],
    queryFn: () =>
      api.get('/instructor/orders', { params: buildParams() }).then((r) => r.data),
  });

  const orders           = data?.orders           ?? [];
  const courses          = data?.courses          ?? [];
  const total            = data?.total            ?? 0;
  const availableStatuses: string[] = data?.availableStatuses ?? [];

  const hasFilters = !!(status || courseId || dateFrom || dateTo);

  function resetFilters() {
    setStatus(''); setCourseId('');
    setDateFrom(''); setDateTo('');
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
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            Comenzile plasate pentru cursurile tale
            {total > 0 && (
              <span className="ml-2 text-xs text-gray-400 dark:text-slate-500">
                ({total} {hasFilters ? 'filtrate' : 'total'})
              </span>
            )}
          </p>
        </div>
        {orders.length > 0 && (
          <button
            onClick={() => exportCsv(orders, hasFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            Export CSV{hasFilters ? ' (filtrat)' : ''}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4 mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Course */}
          <div className="flex-1">
            <Select value={courseId} onValueChange={(v) => setCourseId(v as string)}>
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
          <div className="w-full sm:w-48">
            <Select value={status} onValueChange={(v) => setStatus(v as string)}>
              <SelectTrigger>
                <SelectValue>
                  {status
                    ? (STATUSES.find((s) => s.value === status)?.label ?? status)
                    : 'Toate statusurile'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toate statusurile</SelectItem>
                {STATUSES.filter((s) => availableStatuses.length === 0 || availableStatuses.includes(s.value)).map((s) => (
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
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">Până la</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1"
            />
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
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4">
              <Skeleton className="h-5 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl">
          <ShoppingBag className="w-12 h-12 text-gray-200 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-gray-400 dark:text-slate-500">
            {hasFilters ? 'Nicio comandă nu corespunde filtrelor.' : 'Nicio comandă încă.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.map((order: any) => {
              const s = statusLabel[order.status] ?? { label: order.status, class: '' };
              const isRefunded = order.status === 'refunded';
              return (
                <div
                  key={order._id}
                  className={`border rounded-xl p-4 ${
                    isRefunded
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                      : 'bg-white dark:bg-slate-800 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {order.userId?.name
                          ? order.userId.name.split(' ')[0] + ' ' + (order.userId.name.split(' ')[1]?.[0] ?? '') + '.'
                          : 'Student'}
                      </p>
                      {order.userId?.email && (
                        <p className="text-xs text-gray-400 dark:text-slate-500">{maskEmail(order.userId.email)}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${s.class}`}>
                      {s.label}
                    </span>
                  </div>
                  <ul className="space-y-0.5 mb-2">
                    {order.items.map((item: any, i: number) => (
                      <li key={i} className="text-sm text-gray-700 dark:text-slate-300 truncate">{item.title}</li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString('ro-RO')}
                    </p>
                    <span className={`font-semibold text-sm ${isRefunded ? 'text-red-400' : 'text-emerald-600'}`}>
                      {(order.myRevenue ?? 0).toFixed(2)} RON
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b dark:border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Cursuri</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Venit tău</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {orders.map((order: any) => {
                    const s = statusLabel[order.status] ?? { label: order.status, class: '' };
                    const isRefunded = order.status === 'refunded';
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
                          <p className="font-medium text-gray-900 dark:text-white">
                            {order.userId?.name
                              ? order.userId.name.split(' ')[0] + ' ' + (order.userId.name.split(' ')[1]?.[0] ?? '') + '.'
                              : 'Student'}
                          </p>
                          {order.userId?.email && (
                            <p className="text-xs text-gray-400 dark:text-slate-500">{maskEmail(order.userId.email)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ul className="space-y-0.5">
                            {order.items.map((item: any, i: number) => (
                              <li key={i} className="text-gray-700 dark:text-slate-300">{item.title}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${isRefunded ? 'text-red-400' : 'text-emerald-600'}`}>
                          {(order.myRevenue ?? 0).toFixed(2)} RON
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400 dark:text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString('ro-RO')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
