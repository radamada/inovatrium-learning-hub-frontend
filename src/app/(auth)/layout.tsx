import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <GraduationCap className="text-indigo-600 w-8 h-8" />
        <span className="text-2xl font-bold text-gray-800">
          Ino<span className="text-indigo-600">versity</span>
        </span>
      </Link>
      {children}
    </div>
  );
}
