import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      dark: false,
      toggle: () => {
        const newDark = !get().dark;
        set({ dark: newDark });
        // Persist to server if logged in (fire-and-forget)
        api.patch('/users/me', { darkMode: newDark }).catch(() => {});
      },
    }),
    { name: 'theme' },
  ),
);
