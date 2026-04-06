'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { motion } from 'framer-motion';

const schema = z.object({
  email: z.string().email('Email invalid'),
  password: z.string().min(8, 'Minim 8 caractere'),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { setAuth, user, isHydrated } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Sanitize redirect — only allow relative paths starting with '/' to prevent open redirect
  const rawFrom = searchParams.get('from') ?? '';
  const from = rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/dashboard';
  const isBlocked = searchParams.get('blocked') === '1';

  // Dacă user-ul este deja autentificat client-side, redirecționează la dashboard
  // Așteptăm hydratarea Zustand înainte să redirectăm (previne loop-ul)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isHydrated && user) router.replace('/dashboard');
  }, [user, isHydrated]);

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const passwordValue = watch('password', '');

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken);
      toast.success(`Bine ai venit, ${res.data.user.name}!`);
      router.push(from);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg === 'Contul este dezactivat' || msg === 'ACCOUNT_BLOCKED') {
        router.replace('/login?blocked=1');
      } else {
        toast.error(msg ?? 'Email sau parolă incorectă');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
    >
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-5">
        <h1 className="text-2xl font-bold text-white">Autentificare</h1>
        <p className="text-indigo-200 text-sm mt-1">Intră în contul tău EduInovatrium</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        {isBlocked && (
          <div className="flex gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Cont dezactivat</p>
              <p className="text-xs text-red-600 mt-0.5">
                Contul tău a fost dezactivat de un administrator. Contactează echipa de suport pentru mai multe detalii.
              </p>
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="ion@example.com"
            {...register('email')}
            className="mt-1"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Parolă</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-indigo-600 hover:underline"
            >
              Ai uitat parola?
            </Link>
          </div>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••"
              {...register('password')}
              className="pr-10"
            />
            {passwordValue && (
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Ascunde parola' : 'Afișează parola'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Se autentifică...' : 'Intră în cont'}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Nu ai cont?{' '}
          <Link href="/register" className="text-indigo-600 font-medium hover:underline">
            Înregistrează-te
          </Link>
        </p>
      </form>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
