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
      router.push('/');
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
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-5">
        <h1 className="text-2xl font-bold text-white">Înregistrare</h1>
        <p className="text-indigo-200 text-sm mt-1">Creează-ți contul EduInovatrium gratuit</p>
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
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 accent-indigo-600"
            />
            <span className="text-sm text-gray-600">
              Am citit și accept{' '}
              <Link href="/termeni" target="_blank" className="text-indigo-600 hover:underline font-medium">
                Termenii și Condițiile
              </Link>
              {' '}și{' '}
              <Link href="/confidentialitate" target="_blank" className="text-indigo-600 hover:underline font-medium">
                Politica de Confidențialitate
              </Link>
            </span>
          </label>
          {errors.termsAccepted && (
            <p className="text-red-500 text-xs mt-1">{errors.termsAccepted.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
          {isSubmitting ? 'Se creează contul...' : 'Creează contul'}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Ai deja cont?{' '}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Autentifică-te
          </Link>
        </p>
      </form>
    </motion.div>
  );
}
