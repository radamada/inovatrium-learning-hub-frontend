'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify-certificate', code],
    queryFn: () => api.get(`/certificates/verify/${code}`).then((r) => r.data),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {isError || !data?.valid ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Certificat invalid</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Certificatul nu a putut fi verificat. Codul poate fi incorect sau expirat.
            </p>
            <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
              Înapoi la platformă
            </Link>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Certificat autentic</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Acest certificat a fost emis de platforma Inoversity și este valid.</p>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-6 text-left space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Student</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.studentName}</p>
                </div>
              </div>
              <div className="border-t border-blue-100 dark:border-blue-800" />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Curs absolvit</p>
                <p className="font-semibold text-gray-900 dark:text-white">{data.courseTitle}</p>
              </div>
              <div className="border-t border-blue-100 dark:border-blue-800" />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Data finalizării</p>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {new Date(data.completedAt).toLocaleDateString('ro-RO', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <Link
              href={`/courses/${data.courseSlug}`}
              className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <GraduationCap className="w-4 h-4" />
              Vezi cursul pe platformă
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
