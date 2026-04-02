'use client';

import { create } from 'zustand';
import api from '@/lib/api';

interface WishlistState {
  courseIds: Set<string>;
  isLoading: boolean;
  fetch: () => Promise<void>;
  add: (courseId: string) => Promise<void>;
  remove: (courseId: string) => Promise<void>;
  has: (courseId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  courseIds: new Set(),
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/wishlist');
      const ids = new Set<string>(
        data.map((item: any) => item.courseId?._id ?? item.courseId),
      );
      set({ courseIds: ids });
    } catch {
      // Silently fail — user might not be logged in
    } finally {
      set({ isLoading: false });
    }
  },

  add: async (courseId: string) => {
    // Optimistic update
    set((s) => ({ courseIds: new Set([...s.courseIds, courseId]) }));
    try {
      await api.post(`/wishlist/${courseId}`);
    } catch {
      // Rollback on error
      set((s) => {
        const next = new Set(s.courseIds);
        next.delete(courseId);
        return { courseIds: next };
      });
      throw new Error('Nu s-a putut adăuga în wishlist');
    }
  },

  remove: async (courseId: string) => {
    // Optimistic update
    set((s) => {
      const next = new Set(s.courseIds);
      next.delete(courseId);
      return { courseIds: next };
    });
    try {
      await api.delete(`/wishlist/${courseId}`);
    } catch {
      // Rollback on error
      set((s) => ({ courseIds: new Set([...s.courseIds, courseId]) }));
      throw new Error('Nu s-a putut elimina din wishlist');
    }
  },

  has: (courseId: string) => get().courseIds.has(courseId),
}));
