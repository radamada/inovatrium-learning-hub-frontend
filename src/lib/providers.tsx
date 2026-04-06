'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';
import { makeQueryClient } from './query-client';
import { useAuthStore } from '@/stores/auth.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useCartStore } from '@/stores/cart.store';
import { useThemeStore } from '@/stores/theme.store';

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
  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem('auth-store');
      const parsed = raw ? JSON.parse(raw) : null;
      const user = parsed?.state?.user ?? null;
      // Set synchronously — React re-renders before the browser paints,
      // so isHydrated=false is never visible to the user.
      useAuthStore.setState({ user, isHydrated: true });
    } catch {
      // localStorage unavailable (e.g. private browsing, storage full)
      useAuthStore.setState({ isHydrated: true });
    }
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

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
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
