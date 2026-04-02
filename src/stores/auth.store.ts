'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import api from '@/lib/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
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

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('access_token', token);
        }
        set({ user, accessToken: token });
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {}
        sessionStorage.removeItem('access_token');
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
          set({ user: null, accessToken: null });
          sessionStorage.removeItem('access_token');
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
