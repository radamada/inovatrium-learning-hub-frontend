'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Search, X, Percent } from 'lucide-react';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showRevenueShare, setShowRevenueShare] = useState(false);
  const [revenueInputs, setRevenueInputs] = useState<Record<string, string>>({});
  const [confirmBlockId, setConfirmBlockId] = useState<string | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => {
      const params: Record<string, any> = { page, limit: 20 };
      if (search) params.search = search;
      return api.get('/admin/users', { params }).then((r) => r.data);
    },
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

  const setRevenueShare = useMutation({
    mutationFn: ({ id, percent }: { id: string; percent: number }) =>
      api.patch(`/admin/users/${id}/revenue-share`, { percent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Comision actualizat');
    },
    onError: () => {
      toast.error('Eroare la actualizarea comisionului');
    },
  });

  const handleToggleRevenueShare = () => {
    const next = !showRevenueShare;
    setShowRevenueShare(next);
    if (next && data?.users) {
      const initial: Record<string, string> = {};
      for (const u of data.users) {
        if (u.role === 'instructor') {
          initial[u._id] = String(u.revenueSharePercent ?? 0);
        }
      }
      setRevenueInputs(initial);
    }
  };

  const handleRevenueSave = (userId: string) => {
    const raw = revenueInputs[userId] ?? '0';
    const parsed = parseInt(raw, 10);
    const percent = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
    const user = users.find((u: any) => u._id === userId);
    const current = user?.revenueSharePercent ?? 0;
    if (percent === current) return;
    setRevenueShare.mutate({ id: userId, percent });
  };

  const handleBlockClick = (userId: string) => {
    setConfirmBlockId(userId);
  };

  const handleBlockConfirm = (userId: string) => {
    setActive.mutate({ id: userId, isActive: false });
    setConfirmBlockId(null);
  };

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

  /** Renders the block/activate button area, with inline confirm for blocking */
  const renderActiveToggle = (user: any, size: 'sm' | 'xs') => {
    const btnClass = size === 'xs' ? 'h-8 text-xs flex-shrink-0' : 'h-7 text-xs';

    if (user.isActive && confirmBlockId === user._id) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 whitespace-nowrap">Ești sigur?</span>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs px-2"
            onClick={() => handleBlockConfirm(user._id)}
          >
            Da
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2"
            onClick={() => setConfirmBlockId(null)}
          >
            Nu
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        className={btnClass}
        onClick={() =>
          user.isActive
            ? handleBlockClick(user._id)
            : setActive.mutate({ id: user._id, isActive: true })
        }
      >
        {user.isActive ? 'Blochează' : 'Activează'}
      </Button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Utilizatori</h1>
        <div className="flex items-center gap-3">
          {data?.total > 0 && (
            <span className="text-sm text-gray-400 dark:text-slate-500">
              {data.total} {search ? 'rezultate' : 'total'}
            </span>
          )}
          <Button
            variant={showRevenueShare ? 'default' : 'outline'}
            size="icon"
            onClick={handleToggleRevenueShare}
            title="Comisioane formatori"
            className="h-8 w-8"
          >
            <Percent className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4 mb-5">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(searchInput); }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Caută după email..."
              className="pl-9"
            />
          </div>
          <Button type="submit" size="sm" className="px-4">Caută</Button>
          {search && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setSearchInput(''); handleSearch(''); }}
              className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 border-gray-200 dark:border-slate-700"
            >
              <X className="w-3.5 h-3.5" /> Resetează
            </Button>
          )}
        </form>
      </div>

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
                {renderActiveToggle(user, 'xs')}
              </div>
              {showRevenueShare && user.role === 'instructor' && (
                <div className="mt-3 pt-3 border-t flex items-center gap-2">
                  <label className="text-xs text-gray-500 flex-shrink-0">Comision platformă:</label>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={revenueInputs[user._id] ?? String(user.revenueSharePercent ?? 0)}
                      onChange={(e) => setRevenueInputs((prev) => ({ ...prev, [user._id]: e.target.value }))}
                      onBlur={() => handleRevenueSave(user._id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRevenueSave(user._id); }}
                      className="h-8 text-xs pr-7"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                  </div>
                </div>
              )}
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
                  {showRevenueShare && (
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Comision %</th>
                  )}
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
                    {showRevenueShare && (
                      <td className="px-4 py-3">
                        {user.role === 'instructor' ? (
                          <div className="relative w-24">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={revenueInputs[user._id] ?? String(user.revenueSharePercent ?? 0)}
                              onChange={(e) => setRevenueInputs((prev) => ({ ...prev, [user._id]: e.target.value }))}
                              onBlur={() => handleRevenueSave(user._id)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleRevenueSave(user._id); }}
                              className="h-7 text-xs pr-7"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
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
                        {renderActiveToggle(user, 'sm')}
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
          <span className="flex items-center px-3 text-sm text-gray-600 dark:text-slate-400">{page} / {data.pages}</span>
          <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage((p) => p + 1)}>Următor</Button>
        </div>
      )}
    </motion.div>
  );
}
