'use client';

import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { motion } from 'framer-motion';

const statusLabel: Record<string, { label: string; class: string }> = {
  paid: { label: 'Plătit', class: 'bg-green-100 text-green-700' },
  refunded: { label: 'Rambursat', class: 'bg-red-100 text-red-600' },
  pending: { label: 'În așteptare', class: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: 'Anulat', class: 'bg-red-100 text-red-600' },
};

function exportCsv(orders: any[]) {
  const rows = [
    ['Data', 'Student', 'Email', 'Cursuri', 'Status', 'Venit (RON)'],
    ...orders.map((o) => [
      new Date(o.createdAt).toLocaleDateString('ro-RO'),
      o.userId?.name ?? 'Student',
      o.userId?.email ? maskEmail(o.userId.email) : '',
      o.items.map((i: any) => i.title).join(' | '),
      o.status ?? '',
      (o.myRevenue ?? 0).toFixed(2),
    ]),
  ];
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comenzi-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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

export default function InstructorOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['instructor-orders'],
    queryFn: () => api.get('/instructor/orders?limit=50').then((r) => r.data),
  });

  const orders = data?.orders ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comenzi</h1>
          <p className="text-gray-500 mt-1">Comenzile plasate pentru cursurile tale</p>
        </div>
        {orders.length > 0 && (
          <button
            onClick={() => exportCsv(orders)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border rounded-xl p-4">
              <Skeleton className="h-5 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white border rounded-2xl">
          <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400">Nicio comandă încă.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.map((order: any) => {
              const s = statusLabel[order.status] ?? { label: order.status, class: '' };
              const isRefunded = order.status === 'refunded';
              return (
                <div key={order._id} className={`border rounded-xl p-4 ${isRefunded ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {order.userId?.name ? order.userId.name.split(' ')[0] + ' ' + (order.userId.name.split(' ')[1]?.[0] ?? '') + '.' : 'Student'}
                      </p>
                      {order.userId?.email && (
                        <p className="text-xs text-gray-400">{maskEmail(order.userId.email)}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${s.class}`}>
                      {s.label}
                    </span>
                  </div>
                  <ul className="space-y-0.5 mb-2">
                    {order.items.map((item: any, i: number) => (
                      <li key={i} className="text-sm text-gray-700 truncate">{item.title}</li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
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
          <div className="hidden md:block bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Cursuri</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Venit tău</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order: any) => {
                    const s = statusLabel[order.status] ?? { label: order.status, class: '' };
                    const isRefunded = order.status === 'refunded';
                    return (
                      <tr key={order._id} className={`transition-colors ${isRefunded ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">
                            {order.userId?.name ? order.userId.name.split(' ')[0] + ' ' + (order.userId.name.split(' ')[1]?.[0] ?? '') + '.' : 'Student'}
                          </p>
                          {order.userId?.email && (
                            <p className="text-xs text-gray-400">{maskEmail(order.userId.email)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ul className="space-y-0.5">
                            {order.items.map((item: any, i: number) => (
                              <li key={i} className="text-gray-700">{item.title}</li>
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
                        <td className="px-4 py-3 text-right text-gray-400">
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
