import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <GraduationCap className="text-blue-600 w-8 h-8" />
        <span className="text-2xl font-bold text-gray-800">
          Edu<span className="text-blue-600">Inovatrium</span>
        </span>
      </Link>
      {children}
    </div>
  );
}
