'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function ConfirmNewEmailInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const { fetchMe } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token lipsă sau invalid.');
      return;
    }

    axios
      .post(`${API_URL}/api/users/email/confirm-new`, { token })
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message ?? 'Adresa de email a fost schimbată cu succes.');
        // Refresh user in store so the new email is reflected immediately
        fetchMe().catch(() => {});
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.response?.data?.message ?? 'Token invalid sau expirat.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-gray-800">Se activează noua adresă...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Email schimbat cu succes!</h1>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <Button onClick={() => router.push('/profile')} className="w-full">
              Mergi la profil
            </Button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link invalid</h1>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <Button variant="outline" onClick={() => router.push('/profile')} className="w-full">
              Înapoi la profil
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// useSearchParams() necesită un Suspense boundary la build (altfel next build
// eșuează cu „missing-suspense-with-csr-bailout" și pagina nu se prerenderează).
export default function ConfirmNewEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      }
    >
      <ConfirmNewEmailInner />
    </Suspense>
  );
}
