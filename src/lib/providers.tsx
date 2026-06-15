'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';
import { makeQueryClient } from './query-client';
import { useAuthStore, clearRoleCookie } from '@/stores/auth.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useCartStore } from '@/stores/cart.store';
import { useThemeStore } from '@/stores/theme.store';
import { tokenStore, refreshAccessToken } from '@/lib/api';

/**
 * Reads the persisted auth state from localStorage SYNCHRONOUSLY inside
 * useLayoutEffect, which runs before the browser paints the first frame.
 * This eliminates the "flash" where the header briefly shows login buttons
 * or a skeleton while Zustand's async persist rehydration is pending.
 *
 * Timeline without this component:
 *   render (isHydrated=false, skeleton) → paint → useEffect → rehydrate → re-render → paint ✓
 *
 * Timeline WITH this component:
 *   render (isHydrated=false) → useLayoutEffect (sync read → isHydrated=true) → re-render → paint ✓
 *   The first two renders happen before any paint, so the user always sees the correct state.
 */
function AuthHydrator() {
  // ── Step 1: sync read from localStorage before first paint ──────────────
  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem('auth-store');
      const parsed = raw ? JSON.parse(raw) : null;
      const user = parsed?.state?.user ?? null;
      // Set synchronously — React re-renders before the browser paints,
      // so isHydrated=false is never visible to the user.
      useAuthStore.setState({ user, isHydrated: true });
      // NOTĂ: nu mai derivăm cookie-ul user_role din localStorage — rolul nu mai
      // e persistat (vezi auth.store partialize). Cookie-ul rămâne cel setat la
      // login (TTL 7 zile) și e re-sincronizat server-autoritar de fetchMe() în
      // pasul 2; pe sesiune invalidă, catch-ul din pasul 2 îl curăță.
    } catch {
      // localStorage unavailable (e.g. private browsing, storage full)
      useAuthStore.setState({ isHydrated: true });
    }
  }, []);

  // ── Step 2: proactive token refresh on page load ─────────────────────────
  // tokenStore (access token) is in-memory and resets to null on every hard
  // refresh. Goes through refreshAccessToken() so it shares the same mutex as
  // the 401 interceptor — prevents a race where two parallel /auth/refresh
  // calls rotate the refresh token against each other and force a logout.
  useEffect(() => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    refreshAccessToken()
      .then(() => {
        // Repopulează userul complet (inclusiv `role`, care nu mai e persistat)
        // din server și re-sincronizează cookie-ul user_role. Fără asta, UI-ul
        // role-gated (meniuri instructor/admin) ar lipsi după un hard reload pe
        // paginile care nu au layout cu fetchMe().
        useAuthStore.getState().fetchMe().catch(() => {});
      })
      .catch(() => {
        tokenStore.clear();
        clearRoleCookie();
        try { localStorage.removeItem('auth-store'); } catch {}
        useAuthStore.setState({ user: null, isHydrated: true });
      });
  }, []);

  return null;
}

function WishlistInitializer() {
  const user = useAuthStore((s) => s.user);
  const fetchWishlist = useWishlistStore((s) => s.fetch);

  useEffect(() => {
    if (user) fetchWishlist();
  }, [user]);

  return null;
}

function CartInitializer() {
  const user = useAuthStore((s) => s.user);
  const fetchCart = useCartStore((s) => s.fetchCart);

  useEffect(() => {
    if (user) fetchCart();
  }, [user]);

  return null;
}

function ThemeProvider() {
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Dark mode is only available for logged-in users.
    // Logged-out visitors always see the light theme.
    if (dark && user) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark, user]);

  return null;
}

/**
 * Catches ChunkLoadErrors that escape the React error boundary.
 * These are unhandledRejection events thrown by the webpack/turbopack HMR
 * client when chunk hashes change mid-session (common in dev after rebuilds).
 * Auto-reloads once — avoids infinite reload loops with a sessionStorage flag.
 */
function ChunkErrorRecovery() {
  useEffect(() => {
    const handle = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      const isChunk =
        err?.name === 'ChunkLoadError' ||
        typeof err?.message === 'string' && (
          err.message.includes('Loading chunk') ||
          err.message.includes('Failed to load chunk')
        );
      if (!isChunk) return;
      const key = '__chunk_reload__';
      if (sessionStorage.getItem(key)) return; // already tried once
      sessionStorage.setItem(key, '1');
      window.location.reload();
    };
    window.addEventListener('unhandledrejection', handle);
    // Clear the flag on successful load so future real errors can still recover
    sessionStorage.removeItem('__chunk_reload__');
    return () => window.removeEventListener('unhandledrejection', handle);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ChunkErrorRecovery />
      <AuthHydrator />
      <ThemeProvider />
      <WishlistInitializer />
      <CartInitializer />
      {children}
      <Toaster richColors position="bottom-center" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
