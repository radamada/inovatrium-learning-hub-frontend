import Link from 'next/link';
import { GraduationCap, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="mb-6 relative">
        <span className="text-[120px] font-extrabold text-blue-100 leading-none select-none">
          404
        </span>
        <GraduationCap className="absolute inset-0 m-auto w-16 h-16 text-blue-400" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagina nu a fost găsită</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        Se pare că pagina pe care o cauți nu există sau a fost mutată.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" /> Înapoi acasă
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" /> Explorează cursurile
        </Link>
      </div>
    </div>
  );
}
