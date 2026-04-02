'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import type { Category } from '@/types';

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/categories', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setName('');
      toast.success('Categorie adăugată!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Eroare la adăugare');
    },
  });

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Ștergi categoria "${catName}"? Cursurile asociate vor rămâne fără categorie.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/categories/${id}`);
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categorie ștearsă!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la ștergere');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate(name.trim());
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Categorii</h1>
        <p className="text-gray-500 mt-1">Gestionează categoriile de cursuri</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add category form */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Adaugă categorie</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cat-name">Nume *</Label>
              <Input
                id="cat-name"
                placeholder="ex: Programare Web"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={createMutation.isPending || !name.trim()}
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Se adaugă...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Adaugă</>
              )}
            </Button>
          </form>
        </div>

        {/* Categories list */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : !categories?.length ? (
            <div className="bg-white rounded-xl border py-16 text-center">
              <Tag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Nicio categorie adăugată încă.</p>
              <p className="text-gray-400 text-xs mt-1">Folosește formularul din stânga pentru a adăuga prima categorie.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {categories.length} {categories.length === 1 ? 'categorie' : 'categorii'}
                </p>
              </div>
              <ul className="divide-y">
                {categories.map((cat) => (
                  <li key={cat._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{cat.name}</p>
                        <p className="text-xs text-gray-400">{cat.slug}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(cat._id, cat.name)}
                      disabled={deletingId === cat._id}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition disabled:opacity-50"
                    >
                      {deletingId === cat._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
