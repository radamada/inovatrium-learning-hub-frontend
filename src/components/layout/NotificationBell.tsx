'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, ShoppingBag, RefreshCw, BookOpen, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Notification {
  _id: string;
  type: 'purchase' | 'refund' | 'course_updated';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  purchase: <ShoppingBag className="w-4 h-4 text-green-500 flex-shrink-0" />,
  refund: <RefreshCw className="w-4 h-4 text-orange-500 flex-shrink-0" />,
  course_updated: <BookOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />,
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=15').then((r) => r.data),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications: Notification[] = data?.notifications ?? [];
  const unreadCount: number = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        aria-label="Notificări"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </button>

      {open && (
        <>
          {/* Overlay to close */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <span className="font-semibold text-sm text-gray-800">Notificări</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Marchează toate ca citite
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nicio notificare</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`px-4 py-3 transition-colors ${n.read ? 'bg-white' : 'bg-indigo-50/50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{typeIcon[n.type]}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${n.read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ro })}
                          </p>
                          {!n.read && (
                            <button
                              onClick={() => markRead.mutate(n._id)}
                              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              <Check className="w-3 h-3" /> Marchează ca citit
                            </button>
                          )}
                        </div>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
