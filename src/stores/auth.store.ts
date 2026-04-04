'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import api, { tokenStore } from '@/lib/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isHydrated: false,

      setAuth: (user, token) => {
        tokenStore.set(token);
        set({ user, accessToken: token });
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {}
        tokenStore.clear();
        set({ user: null, accessToken: null });
        window.location.href = '/';
      },

      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data });
          // Sync dark mode preference from server
          if (typeof data.darkMode === 'boolean') {
            const { useThemeStore } = await import('./theme.store');
            const themeStore = useThemeStore.getState();
            if (themeStore.dark !== data.darkMode) {
              useThemeStore.setState({ dark: data.darkMode });
            }
          }
        } catch {
          tokenStore.clear();
          set({ user: null, accessToken: null });
        } finally {
          set({ isLoading: false, isHydrated: true });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    },
  ),
);
