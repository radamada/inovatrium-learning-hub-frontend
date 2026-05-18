'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { motion } from 'framer-motion';

const schema = z.object({
  firstName: z.string().min(2, 'Minim 2 caractere'),
  lastName: z.string().min(2, 'Minim 2 caractere'),
  email: z.string().email('Email invalid'),
  password: z.string().min(8, 'Minim 8 caractere').max(72, 'Maxim 72 caractere').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Parola trebuie să conțină cel puțin o literă mare, o literă mică și o cifră'),
  confirmPassword: z.string(),
  termsAccepted: z.literal(true, { message: 'Trebuie să accepți Termenii și Condițiile' }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Parolele nu coincid',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/register', {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        password: data.password,
        termsAccepted: data.termsAccepted,
      });
      setAuth(res.data.user, res.data.accessToken);
      toast.success('Cont creat cu succes! Bine ai venit!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la înregistrare');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
    >
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
        <h1 className="text-2xl font-bold text-white">Înregistrare</h1>
        <p className="text-blue-200 text-sm mt-1">Creează-ți contul gratuit</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">Prenume</Label>
            <Input id="firstName" placeholder="Ion" {...register('firstName')} className="mt-1" />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <Label htmlFor="lastName">Nume</Label>
            <Input id="lastName" placeholder="Popescu" {...register('lastName')} className="mt-1" />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="ion@example.com" {...register('email')} className="mt-1" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="password">Parolă</Label>
          <Input id="password" type="password" placeholder="••••••" {...register('password')} className="mt-1" />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmă parola</Label>
          <Input id="confirmPassword" type="password" placeholder="••••••" {...register('confirmPassword')} className="mt-1" />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('termsAccepted')}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 accent-blue-600"
            />
            <span className="text-sm text-gray-600">
              Am citit și accept{' '}
              <Link href="/termeni" target="_blank" className="text-blue-600 hover:underline font-medium">
                Termenii și Condițiile
              </Link>
              {' '}și{' '}
              <Link href="/confidentialitate" target="_blank" className="text-blue-600 hover:underline font-medium">
                Politica de Confidențialitate
              </Link>
            </span>
          </label>
          {errors.termsAccepted && (
            <p className="text-red-500 text-xs mt-1">{errors.termsAccepted.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
          {isSubmitting ? 'Se creează contul...' : 'Creează contul'}
        </Button>

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-400 font-medium">sau</span>
          </div>
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem('google_auth_from', '/dashboard');
            window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/auth/google`;
          }}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-2.5 px-4 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Înregistrare cu Google
        </button>

        <p className="text-center text-sm text-gray-600">
          Ai deja cont?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Autentifică-te
          </Link>
        </p>
      </form>
    </motion.div>
  );
}
