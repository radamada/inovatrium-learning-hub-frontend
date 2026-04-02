'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => api.get(`/admin/users?page=${page}&limit=20`).then((r) => r.data),
  });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Rol actualizat');
    },
  });

  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/users/${id}/active`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Status utilizator actualizat');
    },
  });

  const users = data?.users ?? [];

  const roleBadgeColor: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    instructor: 'bg-indigo-100 text-indigo-700',
    student: 'bg-green-100 text-green-700',
  };

  const roleLabel: Record<string, string> = {
    admin: 'Admin',
    instructor: 'Formator',
    student: 'Student',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <h1 className="text-2xl font-bold mb-6">Utilizatori</h1>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {isLoading
          ? [1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          : users.map((user: any) => (
            <div key={user._id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{format(new Date(user.createdAt), 'dd MMM yyyy')}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColor[user.role] ?? ''}`}>
                    {roleLabel[user.role] ?? user.role}
                  </span>
                  <Badge variant={user.isActive ? 'default' : 'secondary'}>
                    {user.isActive ? 'Activ' : 'Inactiv'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={user.role} onValueChange={(role) => setRole.mutate({ id: user._id, role })}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <span>{roleLabel[user.role] ?? user.role}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Formator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs flex-shrink-0"
                  onClick={() => setActive.mutate({ id: user._id, isActive: !user.isActive })}
                >
                  {user.isActive ? 'Blochează' : 'Activează'}
                </Button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Utilizator</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Rol</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Înregistrat</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user: any) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColor[user.role] ?? ''}`}>
                        {roleLabel[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(user.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Activ' : 'Inactiv'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Select value={user.role} onValueChange={(role) => setRole.mutate({ id: user._id, role })}>
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <span>{roleLabel[user.role] ?? user.role}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="instructor">Formator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setActive.mutate({ id: user._id, isActive: !user.isActive })}
                        >
                          {user.isActive ? 'Blochează' : 'Activează'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
