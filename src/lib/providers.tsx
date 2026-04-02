'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from './query-client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useThemeStore } from '@/stores/theme.store';

function WishlistInitializer() {
  const user = useAuthStore((s) => s.user);
  const fetchWishlist = useWishlistStore((s) => s.fetch);

  useEffect(() => {
    if (user) fetchWishlist();
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
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider />
      <WishlistInitializer />
      {children}
      <Toaster richColors position="bottom-center" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
