'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { tokenStore } from '@/lib/api';
import api from '@/lib/api';
import { resolvePostLoginDestination } from '@/lib/auth-redirect';
import { toast } from 'sonner';

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      toast.error('Autentificarea cu Google a eșuat. Încearcă din nou.');
      router.replace('/login');
      return;
    }

    // Store token in memory so the /auth/me request can be authorized
    tokenStore.set(token);

    // Remove token from URL immediately — it should never sit in browser history
    window.history.replaceState({}, '', '/auth/google/callback');

    // Retrieve the "from" path saved in sessionStorage before the OAuth redirect
    const rawFrom = sessionStorage.getItem('google_auth_from') ?? '';
    sessionStorage.removeItem('google_auth_from');
    const from = rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/dashboard';

    // Fetch full user object (confirms token is valid and account is active)
    api
      .get('/auth/me')
      .then(async (res) => {
        setAuth(res.data, token);
        // Wait for Zustand persist microtask to flush user → localStorage
        // and the role cookie to be observable by middleware. Without this,
        // router.replace can navigate before the destination page can read
        // the persisted auth state, causing a flash of unauthenticated UI.
        await new Promise((r) => setTimeout(r, 0));
        toast.success(`Bine ai venit, ${res.data.name}!`);
        const destination = await resolvePostLoginDestination(from);
        router.replace(destination);
      })
      .catch(() => {
        tokenStore.clear();
        toast.error('Autentificarea cu Google a eșuat. Încearcă din nou.');
        router.replace('/login');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm">Se autentifică cu Google...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <GoogleCallbackHandler />
    </Suspense>
  );
}
