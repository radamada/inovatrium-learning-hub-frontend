'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const statusLabel: Record<string, { label: string; class: string }> = {
  pending: { label: 'În așteptare', class: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Plătit', class: 'bg-green-100 text-green-700' },
  refunded: { label: 'Rambursat', class: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Anulat', class: 'bg-red-100 text-red-600' },
};

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: () => api.get(`/admin/orders?page=${page}&limit=20`).then((r) => r.data),
    staleTime: 0,
    refetchOnWindowFocus: true,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <h1 className="text-2xl font-bold mb-6">Comenzi</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Nu există comenzi încă.</p>
            ) : orders.map((order: any) => {
              const s = statusLabel[order.status] ?? { label: order.status, class: '' };
              const isRefunded = order.status === 'refunded';
              return (
                <div key={order._id} className={`rounded-xl border p-4 ${isRefunded ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{order.userId?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{order.userId?.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${s.class}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <ul className="space-y-0.5 flex-1 min-w-0 mr-2">
                      {order.items.map((item: any, i: number) => (
                        <li key={i} className="text-gray-700 truncate">{item.title}</li>
                      ))}
                    </ul>
                    <span className={`font-semibold flex-shrink-0 ${isRefunded ? 'text-red-400' : 'text-indigo-700'}`}>
                      {order.total.toFixed(2)} lei
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {format(new Date(order.createdAt), 'dd MMM yyyy HH:mm')}
                    </span>
                    {order.status === 'paid' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Ești sigur că vrei să rambursezi această comandă?')) {
                            refund.mutate(order._id);
                          }
                        }}
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
          <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Utilizator</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Cursuri</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Total</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order: any) => {
                    const s = statusLabel[order.status] ?? { label: order.status, class: '' };
                    const isRefunded = order.status === 'refunded';
                    return (
                      <tr key={order._id} className={`transition-colors ${isRefunded ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{order.userId?.name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{order.userId?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <ul className="space-y-0.5">
                            {order.items.map((item: any, i: number) => (
                              <li key={i} className="text-gray-700">{item.title}</li>
                            ))}
                          </ul>
                        </td>
                        <td className={`px-4 py-3 font-semibold ${isRefunded ? 'text-red-400' : 'text-indigo-700'}`}>
                          {order.total.toFixed(2)} lei
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {format(new Date(order.createdAt), 'dd MMM yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {order.status === 'paid' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => {
                                if (confirm('Ești sigur că vrei să rambursezi această comandă?')) {
                                  refund.mutate(order._id);
                                }
                              }}
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
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        Nu există comenzi încă.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {data?.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Înapoi</Button>
          <span className="flex items-center px-3 text-sm">{page} / {data.pages}</span>
          <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage((p) => p + 1)}>Următor</Button>
        </div>
      )}
    </motion.div>
  );
}
