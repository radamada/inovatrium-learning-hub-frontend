'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Mail, MessageSquare, Phone, MapPin, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';

const schema = z.object({
  name: z.string().min(2, 'Minim 2 caractere'),
  email: z.string().email('Email invalid'),
  subject: z.string().min(3, 'Minim 3 caractere'),
  message: z.string().min(10, 'Minim 10 caractere'),
});
type FormData = z.infer<typeof schema>;

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/contact', data);
      setSent(true);
      reset();
    } catch {
      toast.error('Eroare la trimiterea mesajului. Încearcă din nou.');
    }
  };

  return (
    <div className="max-w-5xl 3xl:max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Contact</h1>
        <p className="text-gray-500 mt-2">
          Ai întrebări sau sugestii? Suntem aici să te ajutăm.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Info panel */}
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Email</p>
              <a href="mailto:contact@inovatrium.ro" className="text-sm text-blue-600 hover:underline">
                contact@inovatrium.ro
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Telefon</p>
              <p className="text-sm text-gray-500">+40 700 000 000</p>
              <p className="text-xs text-gray-400">Luni – Vineri, 9:00 – 18:00</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Adresă</p>
              <p className="text-sm text-gray-500">București, România</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Timp de răspuns</p>
              <p className="text-sm text-gray-500">De obicei în 24–48 de ore</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Mesaj trimis!</h2>
              <p className="text-gray-500 mb-6">
                Îți mulțumim pentru mesaj. Te vom contacta în cel mai scurt timp.
              </p>
              <Button
                onClick={() => setSent(false)}
                variant="outline"
              >
                Trimite un alt mesaj
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-2xl p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nume complet</Label>
                  <Input
                    id="name"
                    placeholder="Ion Popescu"
                    {...register('name')}
                    className="mt-1"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ion@example.com"
                    {...register('email')}
                    className="mt-1"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subiect</Label>
                <Input
                  id="subject"
                  placeholder="ex. Problemă la accesarea unui curs"
                  {...register('subject')}
                  className="mt-1"
                />
                {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
              </div>

              <div>
                <Label htmlFor="message">Mesaj</Label>
                <Textarea
                  id="message"
                  placeholder="Descrie problema sau întrebarea ta..."
                  rows={6}
                  {...register('message')}
                  className="mt-1 resize-none"
                />
                {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Se trimite...' : 'Trimite mesajul'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
