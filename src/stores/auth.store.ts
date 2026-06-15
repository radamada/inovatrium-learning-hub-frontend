'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import api, { tokenStore } from '@/lib/api';
import { COOKIE_MAX_AGE_S } from '@/lib/constants/timings';
import { IS_PROD, USER_ROLE_COOKIE } from '@/lib/constants/cookies';

// ── Cookie helpers (client-side, same origin as middleware) ───────────────────
// The backend sets its own httpOnly cookies on localhost:3001, which the browser
// does NOT forward to localhost:3000 (different port = different cookie jar in
// strict implementations). By writing user_role via document.cookie we guarantee
// the middleware always has access to the role on every request to localhost:3000.
const ROLE_COOKIE_MAX_AGE = COOKIE_MAX_AGE_S.USER_ROLE;
// Prefixul `__Host-` cere atributul Secure; setarea Secure pe dev (HTTP) e ignorată
// silent de browser, dar pe prod e obligatorie pentru ca cookie-ul să fie acceptat.
const SECURE_ATTR = IS_PROD ? '; Secure' : '';

// localStorage key used to broadcast a logout to other open tabs (storage event).
const AUTH_LOGOUT_BROADCAST_KEY = 'auth-logout-broadcast';

export function setRoleCookie(role: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${USER_ROLE_COOKIE}=${role}; path=/; max-age=${ROLE_COOKIE_MAX_AGE}; samesite=strict${SECURE_ATTR}`;
}

export function clearRoleCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${USER_ROLE_COOKIE}=; path=/; max-age=0; samesite=strict${SECURE_ATTR}`;
}

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
        // Set user_role cookie on the FRONTEND origin (localhost:3000) so that
        // Next.js middleware can read it on every page request. The backend sets
        // its own httpOnly cookie on localhost:3001, which is a different origin
        // and is NOT sent to the middleware running on localhost:3000.
        setRoleCookie(user.role);
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {}
        tokenStore.clear();
        clearRoleCookie();
        set({ user: null, accessToken: null });
        // Broadcast to other tabs so they log out too. We write a fresh value
        // each time (timestamp) to ensure the storage event fires even if
        // another logout happened recently.
        try {
          localStorage.setItem(AUTH_LOGOUT_BROADCAST_KEY, String(Date.now()));
        } catch {}
        // Clear cart immediately so the next user doesn't briefly see stale items
        const { useCartStore } = await import('./cart.store');
        useCartStore.getState().resetItems();
        window.location.href = '/';
      },

      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data });
          // Re-sincronizează cookie-ul user_role (citit de middleware) cu rolul
          // autoritar de la server — nu doar la login. Dacă rolul s-a schimbat
          // server-side (ex. demotare), middleware-ul vede valoarea corectă.
          setRoleCookie(data.role);
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
      // Nu persistăm `role` în localStorage: e folosit doar pentru UI, iar o
      // valoare alterată (XSS / extensie de browser) ar afișa meniuri
      // privilegiate înșelătoare. Rolul autoritar e re-citit din fetchMe()
      // (server) la fiecare încărcare. JSON.stringify omite `undefined`, deci
      // role nu ajunge în storage; live state-ul păstrează userul complet.
      partialize: (state) => ({
        user: state.user ? ({ ...state.user, role: undefined } as unknown as User) : null,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    },
  ),
);

// Cross-tab logout sync: when one tab calls logout(), broadcast via localStorage
// and other tabs hard-reload so their in-memory token + cart are wiped too.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === AUTH_LOGOUT_BROADCAST_KEY && e.newValue) {
      tokenStore.clear();
      clearRoleCookie();
      useAuthStore.setState({ user: null, accessToken: null });
      // Hard reload to drop any in-memory state from other stores too
      window.location.href = '/';
    }
  });
}
