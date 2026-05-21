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
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      toast.error('Autentificarea cu Google a eșuat. Încearcă din nou.');
      router.replace('/login');
      return;
    }

    // Curățăm imediat URL-ul. Codul e single-use și e consumat la exchange,
    // dar îl scoatem oricum din history ca să nu pară activ.
    window.history.replaceState({}, '', '/auth/google/callback');

    // Retrieve the "from" path saved in sessionStorage before the OAuth redirect
    const rawFrom = sessionStorage.getItem('google_auth_from') ?? '';
    sessionStorage.removeItem('google_auth_from');
    const from = rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/dashboard';

    // Schimbăm codul one-time pe tokens. BE setează refresh_token + user_role
    // cookies și returnează accessToken + user în body.
    api
      .post('/auth/google/exchange', { code })
      .then(async (res) => {
        setAuth(res.data.user, res.data.accessToken);
        await new Promise((r) => setTimeout(r, 0));
        toast.success(`Bine ai venit, ${res.data.user.name}!`);
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
