'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';

const schema = z.object({ email: z.string().email('Email invalid') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/forgot-password', data);
      toast.success('Verifică emailul pentru instrucțiuni de resetare');
    } catch {
      toast.error('A apărut o eroare. Încearcă din nou.');
    }
  };

  if (isSubmitSuccessful) {
    return (
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-bold mb-2">Email trimis!</h2>
        <p className="text-gray-500 mb-6">
          Dacă emailul există în baza de date, vei primi instrucțiuni de resetare a parolei.
        </p>
        <Link href="/login" className="text-blue-600 hover:underline text-sm">
          Înapoi la autentificare
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
        <h1 className="text-2xl font-bold text-white">Resetare parolă</h1>
        <p className="text-blue-200 text-sm mt-1">
          Introdu emailul tău și îți trimitem instrucțiuni
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="ion@example.com" {...register('email')} className="mt-1" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
          {isSubmitting ? 'Se trimite...' : 'Trimite instrucțiuni'}
        </Button>
        <p className="text-center text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            ← Înapoi la autentificare
          </Link>
        </p>
      </form>
    </div>
  );
}
