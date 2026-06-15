'use client';

import { use } from 'react';
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
import { passwordSchema } from '@/lib/auth-schemas';

const schema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Parolele nu coincid',
    path: ['confirm'],
  });
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post(`/auth/reset-password/${token}`, { password: data.password });
      toast.success('Parola a fost resetată! Te poți autentifica acum.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Link invalid sau expirat.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
        <h1 className="text-2xl font-bold text-white">Parolă nouă</h1>
        <p className="text-blue-200 text-sm mt-1">Alege o parolă sigură pentru contul tău</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div>
          <Label htmlFor="password">Parolă nouă</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••"
            {...register('password')}
            className="mt-1"
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="confirm">Confirmă parola</Label>
          <Input
            id="confirm"
            type="password"
            placeholder="••••••"
            {...register('confirm')}
            className="mt-1"
          />
          {errors.confirm && (
            <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Se salvează...' : 'Salvează parola nouă'}
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
