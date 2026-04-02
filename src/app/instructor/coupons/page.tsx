'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Ticket, Loader2, ToggleLeft, ToggleRight,
  RefreshCw, Pencil, BookOpen,
} from 'lucide-react';
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
  courseId: { _id: string; title: string; slug: string } | null;
  createdAt: string;
}

interface CourseOption { _id: string; title: string; }

type Mode = 'custom' | 'random';

interface CouponForm {
  mode: Mode;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: string;
  maxUses: string;
  maxUsesPerUser: string;
  minOrderAmount: string;
  expiresAt: string;
  courseId: string;
}

const emptyForm: CouponForm = {
  mode: 'custom',
  code: '',
  discountType: 'percent',
  discountValue: '',
  maxUses: '',
  maxUsesPerUser: '',
  minOrderAmount: '',
  expiresAt: '',
  courseId: '',
};

export default function InstructorCouponsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ['instructor-coupons'],
    queryFn: () => api.get('/instructor/coupons').then((r) => r.data),
  });

  const { data: myCourses } = useQuery<CourseOption[]>({
    queryKey: ['instructor-courses-list'],
    queryFn: () => api.get('/instructor/courses').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (dto: Record<string, unknown>) => api.post('/instructor/coupons', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-coupons'] });
      setForm(emptyForm);
      toast.success('Cupon creat!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Eroare la creare');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Record<string, unknown> }) =>
      api.patch(`/instructor/coupons/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-coupons'] });
      setEditingId(null);
      setForm(emptyForm);
      toast.success('Cupon actualizat!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Eroare la actualizare');
    },
  });

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Ștergi cuponul "${code}"?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/instructor/coupons/${id}`);
      qc.invalidateQueries({ queryKey: ['instructor-coupons'] });
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
      await api.patch(`/instructor/coupons/${coupon._id}`, { isActive: !coupon.isActive });
      qc.invalidateQueries({ queryKey: ['instructor-coupons'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare');
    } finally {
      setTogglingId(null);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon._id);
    setForm({
      mode: 'custom',
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      maxUses: coupon.maxUses !== null ? String(coupon.maxUses) : '',
      maxUsesPerUser: (coupon as any).maxUsesPerUser != null ? String((coupon as any).maxUsesPerUser) : '',
      minOrderAmount: coupon.minOrderAmount > 0 ? String(coupon.minOrderAmount) : '',
      expiresAt: coupon.expiresAt
        ? new Date(coupon.expiresAt).toISOString().slice(0, 16)
        : '',
      courseId: coupon.courseId?._id ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
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
    if (form.mode === 'custom' && !form.code.trim() && !editingId) {
      toast.error('Introdu un cod sau selectează generarea automată');
      return;
    }

    const dto: Record<string, unknown> = {
      discountType: form.discountType,
      discountValue: value,
      maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
      maxUsesPerUser: form.maxUsesPerUser ? parseInt(form.maxUsesPerUser, 10) : null,
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : 0,
      expiresAt: form.expiresAt || null,
      courseId: form.courseId || undefined,
    };

    if (!editingId) {
      // Create
      if (form.mode === 'random') {
        dto.random = true;
      } else {
        dto.code = form.code.trim().toUpperCase();
      }
      createMutation.mutate(dto);
    } else {
      // Update — don't send code (can't change code after creation)
      updateMutation.mutate({ id: editingId, dto });
    }
  };

  const isExpired = (coupon: Coupon) =>
    coupon.expiresAt && new Date(coupon.expiresAt) < new Date();

  const formatDiscount = (coupon: Coupon) =>
    coupon.discountType === 'percent'
      ? `${coupon.discountValue}%`
      : `${coupon.discountValue.toFixed(2)} lei`;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cupoanele mele</h1>
        <p className="text-gray-500 mt-1">
          Creează coduri promoționale pentru cursurile tale. Studenții le pot folosi la checkout.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editingId ? 'Editează cupon' : 'Cupon nou'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mode toggle — only for create */}
            {!editingId && (
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
                {form.mode === 'random' && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Se va genera un cod unic de 10 caractere.
                  </p>
                )}
              </div>
            )}

            {/* Code input — only for custom mode and not editing */}
            {!editingId && form.mode === 'custom' && (
              <div>
                <Label htmlFor="coupon-code">Cod *</Label>
                <Input
                  id="coupon-code"
                  placeholder="ex: CURSURI30"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="mt-1 uppercase"
                  maxLength={50}
                />
              </div>
            )}

            {/* Editing — show current code (read-only) */}
            {editingId && (
              <div>
                <Label>Cod (nu poate fi schimbat)</Label>
                <Input value={form.code} readOnly className="mt-1 bg-gray-50 text-gray-500 cursor-not-allowed" />
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
                placeholder="ex: 50"
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
              <Label htmlFor="expires-at">Expiră la</Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="course-id">Restricționează la un curs (opțional)</Label>
              <select
                id="course-id"
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Toate cursurile mele —</option>
                {(myCourses ?? []).map((c) => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {form.courseId ? 'Reducerea se aplică doar pentru acest curs.' : 'Reducerea se aplică pentru toate cursurile tale.'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={isPending || (!editingId && form.mode === 'custom' && !form.code.trim()) || !form.discountValue}
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Se salvează...</>
                ) : editingId ? (
                  'Salvează modificările'
                ) : (
                  <><Plus className="w-4 h-4 mr-2" /> Creează cupon</>
                )}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Anulează
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-8 w-20 rounded" />
                </div>
              ))}
            </div>
          ) : !coupons?.length ? (
            <div className="bg-white rounded-xl border py-16 text-center">
              <Ticket className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Nu ai creat niciun cupon încă.</p>
              <p className="text-gray-400 text-xs mt-1">
                Folosește formularul din stânga pentru a crea primul cod promoțional.
              </p>
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
                  const exhausted =
                    coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
                  return (
                    <li
                      key={coupon._id}
                      className={`px-5 py-4 hover:bg-gray-50 transition ${
                        editingId === coupon._id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-gray-900">
                              {coupon.code}
                            </span>
                            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              -{formatDiscount(coupon)}
                            </span>
                            {!coupon.isActive && (
                              <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                                Inactiv
                              </span>
                            )}
                            {expired && (
                              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                                Expirat
                              </span>
                            )}
                            {exhausted && (
                              <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">
                                Epuizat
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                            <span>
                              Folosit:{' '}
                              <strong className="text-gray-600">{coupon.usedCount}</strong>
                              {coupon.maxUses !== null ? `/${coupon.maxUses}` : ''} ori
                            </span>
                            {coupon.courseId && (
                              <span className="flex items-center gap-1 text-purple-600">
                                <BookOpen className="w-3 h-3" />
                                {coupon.courseId.title}
                              </span>
                            )}
                            {!coupon.courseId && (
                              <span className="text-gray-400 italic">toate cursurile</span>
                            )}
                            {coupon.expiresAt && (
                              <span>
                                Expiră:{' '}
                                {new Date(coupon.expiresAt).toLocaleDateString('ro-RO', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(coupon)}
                            title="Editează"
                            aria-label={`Editează cuponul ${coupon.code}`}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition focus-visible:ring-2 focus-visible:ring-indigo-400"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggle(coupon)}
                            disabled={togglingId === coupon._id}
                            aria-label={coupon.isActive ? `Dezactivează cuponul ${coupon.code}` : `Activează cuponul ${coupon.code}`}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-400"
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
                            aria-label={`Șterge cuponul ${coupon.code}`}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-red-400"
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
