'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Ticket, Loader2, ToggleLeft, ToggleRight, RefreshCw, User, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface Coupon {
  _id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  minOrderAmount: number;
  instructorId: { _id: string; name: string; email: string; role?: string } | null;
  courseId: { _id: string; title: string; slug: string } | null;
  createdAt: string;
}

interface CourseOption { _id: string; title: string; instructorId: string | { _id: string } | null; }

interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
}

type Mode = 'custom' | 'random';

interface CouponForm {
  mode: Mode;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: string;
  maxUses: string;
  maxUsesPerUser: string;
  expiresAt: string;
  minOrderAmount: string;
  instructorId: string;
  courseId: string;
}

const defaultForm: CouponForm = {
  mode: 'custom',
  code: '',
  discountType: 'percent',
  discountValue: '',
  maxUses: '',
  maxUsesPerUser: '',
  expiresAt: '',
  minOrderAmount: '',
  instructorId: '',
  courseId: '',
};

export default function AdminCouponsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<CouponForm>(defaultForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ['admin-coupons'],
    queryFn: () => api.get('/coupons').then((r) => r.data),
  });

  const { data: users } = useQuery<UserOption[]>({
    queryKey: ['admin-users-all'],
    queryFn: () => api.get('/admin/users?limit=200').then((r) => r.data.users ?? r.data),
  });
  const instructors = users?.filter((u) => u.role === 'instructor') ?? [];

  const { data: allCourses } = useQuery<CourseOption[]>({
    queryKey: ['admin-courses-all'],
    queryFn: () => api.get('/admin/courses?limit=200').then((r) => r.data.courses ?? r.data),
  });

  // Cursuri filtrate după instructorul selectat (sau toate dacă nu e selectat instructor)
  const filteredCourses = (allCourses ?? []).filter((c) => {
    if (!form.instructorId) return true;
    const instId = typeof c.instructorId === 'object' && c.instructorId !== null
      ? (c.instructorId as any)._id
      : c.instructorId;
    return instId === form.instructorId;
  });

  const createMutation = useMutation({
    mutationFn: (dto: Record<string, unknown>) => api.post('/coupons', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      setForm(defaultForm);
      toast.success('Cupon creat!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Eroare la creare');
    },
  });

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Ștergi cuponul "${code}"?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/coupons/${id}`);
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Cupon șters!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la ștergere');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    setTogglingId(coupon._id);
    try {
      await api.patch(`/coupons/${coupon._id}`, { isActive: !coupon.isActive });
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(form.discountValue);
    if (isNaN(value) || value <= 0) {
      toast.error('Valoarea reducerii trebuie să fie un număr pozitiv');
      return;
    }
    if (form.discountType === 'percent' && value > 100) {
      toast.error('Reducerea procentuală nu poate depăși 100%');
      return;
    }
    if (form.mode === 'custom' && !form.code.trim()) {
      toast.error('Introdu un cod sau selectează generarea automată');
      return;
    }

    const dto: Record<string, unknown> = {
      discountType: form.discountType,
      discountValue: value,
      maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
      maxUsesPerUser: form.maxUsesPerUser ? parseInt(form.maxUsesPerUser, 10) : null,
      expiresAt: form.expiresAt || null,
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : 0,
      instructorId: form.instructorId || undefined,
      courseId: form.courseId || undefined,
    };

    if (form.mode === 'random') {
      dto.random = true;
    } else {
      dto.code = form.code.trim().toUpperCase();
    }

    createMutation.mutate(dto);
  };

  const formatDiscount = (coupon: Coupon) =>
    coupon.discountType === 'percent'
      ? `${coupon.discountValue}%`
      : `${coupon.discountValue.toFixed(2)} lei`;

  const isExpired = (coupon: Coupon) =>
    coupon.expiresAt && new Date(coupon.expiresAt) < new Date();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cupoane de reducere</h1>
        <p className="text-gray-500 mt-1">Creează și gestionează coduri promoționale globale sau per formator</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create form */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Cupon nou</h2>
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Mode toggle */}
            <div>
              <Label>Tip cod</Label>
              <div className="mt-1 flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, mode: 'custom' })}
                  className={`flex-1 py-2 text-sm font-medium transition ${
                    form.mode === 'custom'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Custom
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, mode: 'random', code: '' })}
                  className={`flex-1 py-2 text-sm font-medium transition flex items-center justify-center gap-1.5 ${
                    form.mode === 'random'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Automat
                </button>
              </div>
            </div>

            {form.mode === 'custom' && (
              <div>
                <Label htmlFor="coupon-code">Cod *</Label>
                <Input
                  id="coupon-code"
                  placeholder="ex: VARA2025"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="mt-1 uppercase"
                  maxLength={50}
                />
              </div>
            )}

            <div>
              <Label htmlFor="discount-type">Tip reducere *</Label>
              <select
                id="discount-type"
                value={form.discountType}
                onChange={(e) =>
                  setForm({ ...form, discountType: e.target.value as 'percent' | 'fixed' })
                }
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="percent">Procentual (%)</option>
                <option value="fixed">Sumă fixă (lei)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="discount-value">
                Valoare * {form.discountType === 'percent' ? '(%)' : '(lei)'}
              </Label>
              <Input
                id="discount-value"
                type="number"
                min="0.01"
                max={form.discountType === 'percent' ? '100' : undefined}
                step="0.01"
                placeholder={form.discountType === 'percent' ? '20' : '50.00'}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="max-uses">Utilizări maxime total (gol = nelimitat)</Label>
              <Input
                id="max-uses"
                type="number"
                min="1"
                step="1"
                placeholder="ex: 100"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="max-uses-per-user">Utilizări maxime per user (gol = nelimitat)</Label>
              <Input
                id="max-uses-per-user"
                type="number"
                min="1"
                step="1"
                placeholder="ex: 1"
                value={form.maxUsesPerUser}
                onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="min-order">Sumă minimă comandă (lei)</Label>
              <Input
                id="min-order"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="expires-at">Expiră la (opțional)</Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Assign to instructor */}
            <div>
              <Label htmlFor="instructor-id">Atribuie unui formator (opțional)</Label>
              <select
                id="instructor-id"
                value={form.instructorId}
                onChange={(e) => setForm({ ...form, instructorId: e.target.value, courseId: '' })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Global (toți formatorii) —</option>
                {instructors.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Assign to specific course */}
            <div>
              <Label htmlFor="course-id">Restricționează la un curs (opțional)</Label>
              <select
                id="course-id"
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Toate cursurile —</option>
                {filteredCourses.map((c) => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {form.courseId
                  ? 'Reducerea se aplică doar pentru acest curs.'
                  : form.instructorId
                  ? 'Reducerea se aplică pentru toate cursurile formatorului selectat.'
                  : 'Reducerea se aplică global la orice curs.'}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={
                createMutation.isPending ||
                !form.discountValue ||
                (form.mode === 'custom' && !form.code.trim())
              }
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Se creează...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Creează cupon</>
              )}
            </Button>
          </form>
        </div>

        {/* Coupons list */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : !coupons?.length ? (
            <div className="bg-white rounded-xl border py-16 text-center">
              <Ticket className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Niciun cupon creat încă.</p>
              <p className="text-gray-400 text-xs mt-1">Folosește formularul din stânga pentru a crea primul cupon.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {coupons.length} {coupons.length === 1 ? 'cupon' : 'cupoane'}
                </p>
              </div>
              <ul className="divide-y">
                {coupons.map((coupon) => {
                  const expired = isExpired(coupon);
                  const exhausted = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
                  return (
                    <li key={coupon._id} className="px-5 py-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-gray-900">{coupon.code}</span>
                            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              -{formatDiscount(coupon)}
                            </span>
                            {!coupon.isActive && (
                              <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">Inactiv</span>
                            )}
                            {expired && (
                              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">Expirat</span>
                            )}
                            {exhausted && (
                              <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">Epuizat</span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                            <span>
                              Folosit: {coupon.usedCount}{coupon.maxUses !== null ? `/${coupon.maxUses}` : ''} ori
                            </span>
                            {coupon.minOrderAmount > 0 && (
                              <span>Min. {coupon.minOrderAmount.toFixed(2)} lei</span>
                            )}
                            {coupon.expiresAt && (
                              <span>Expiră: {new Date(coupon.expiresAt).toLocaleDateString('ro-RO')}</span>
                            )}
                            {coupon.courseId && (
                              <span className="flex items-center gap-1 text-purple-600">
                                <BookOpen className="w-3 h-3" />
                                {coupon.courseId.title}
                              </span>
                            )}
                            {!coupon.courseId && coupon.instructorId && (
                              <span className="flex items-center gap-1 text-indigo-500">
                                <User className="w-3 h-3" />
                                {coupon.instructorId.name}
                              </span>
                            )}
                            {!coupon.courseId && !coupon.instructorId && (
                              <span className="text-gray-400 italic">global</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleToggle(coupon)}
                            disabled={togglingId === coupon._id}
                            title={coupon.isActive ? 'Dezactivează' : 'Activează'}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition disabled:opacity-50"
                          >
                            {togglingId === coupon._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : coupon.isActive ? (
                              <ToggleRight className="w-5 h-5 text-indigo-500" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(coupon._id, coupon.code)}
                            disabled={deletingId === coupon._id}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition disabled:opacity-50"
                          >
                            {deletingId === coupon._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
