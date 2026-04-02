'use client';

import { create } from 'zustand';
import type { CartItem } from '@/types';
import api from '@/lib/api';
import { toast } from 'sonner';

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (courseId: string) => Promise<void>;
  removeItem: (courseId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalPrice: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/cart');
      set({ items: data.items ?? [] });
    } catch {
      set({ items: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (courseId: string) => {
    try {
      const { data } = await api.post('/cart/items', { courseId });
      set({ items: data.items ?? [] });
      toast.success('Cursul a fost adăugat în coș!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la adăugare în coș');
    }
  },

  removeItem: async (courseId: string) => {
    try {
      const { data } = await api.delete(`/cart/items/${courseId}`);
      set({ items: data.items ?? [] });
    } catch {
      toast.error('Eroare la eliminare din coș');
    }
  },

  clearCart: async () => {
    try {
      await api.delete('/cart');
      set({ items: [] });
    } catch {}
  },

  totalPrice: () => get().items.reduce((sum, i) => sum + i.price, 0),
  itemCount: () => get().items.length,
}));
