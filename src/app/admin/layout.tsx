'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, LayoutDashboard, BookOpen, Users, ShoppingBag, Tag, Ticket, ArrowLeft, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'General', icon: LayoutDashboard, exact: true },
  { href: '/admin/courses', label: 'Cursuri', icon: BookOpen },
  { href: '/admin/categories', label: 'Categorii', icon: Tag },
  { href: '/admin/users', label: 'Utilizatori', icon: Users },
  { href: '/admin/orders', label: 'Comenzi', icon: ShoppingBag },
  { href: '/admin/coupons', label: 'Cupoane', icon: Ticket },
];

function SidebarContent({ pathname, onNavClick }: { pathname: string; onNavClick?: () => void }) {
  return (
    <>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-indigo-400 w-6 h-6" />
          <span className="font-bold">Panou administrator</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <Link
          href="/"
          onClick={onNavClick}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> Înapoi la site
        </Link>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (user && user.role !== 'admin') router.push('/');
    if (!user) router.push('/login');
  }, [user, hydrated]);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!hydrated) return null;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-gray-900 text-white flex-col flex-shrink-0">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col z-50 transition-transform duration-300 lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent pathname={pathname} onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 text-white">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded hover:bg-gray-700 transition">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <GraduationCap className="text-indigo-400 w-5 h-5" />
            <span className="font-bold text-sm">Panou administrator</span>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
