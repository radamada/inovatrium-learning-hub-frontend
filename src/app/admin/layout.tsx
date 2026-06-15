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
      <div className="p-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-blue-400 w-6 h-6" />
          <span className="font-bold text-slate-100">Panou administrator</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
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
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700/60">
        <Link
          href="/"
          onClick={onNavClick}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> Înapoi la site
        </Link>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isHydrated, fetchMe } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Server-verified role gate. The persisted `user.role` from localStorage
  // can be stale (e.g. admin demoted server-side) — rendering admin chrome
  // before re-verifying causes a flash of privileged UI. We block render
  // until /auth/me confirms the role on this mount.
  const [serverVerified, setServerVerified] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
    // Re-verify with server on every admin mount. If demoted, fetchMe updates
    // the store, the next effect run hits the `!== 'admin'` branch and redirects.
    let cancelled = false;
    fetchMe()
      .then(() => {
        if (cancelled) return;
        const fresh = useAuthStore.getState().user;
        if (!fresh) {
          router.push('/login');
        } else if (fresh.role !== 'admin') {
          router.push('/');
        } else {
          setServerVerified(true);
        }
      })
      .catch(() => {
        if (!cancelled) router.push('/login');
      });
    return () => { cancelled = true; };
  // We intentionally re-verify only on hydrate / pathname change, not on every
  // user-object mutation (which would loop because fetchMe writes to user).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, pathname]);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!isHydrated) return null;
  if (!user || user.role !== 'admin') return null;
  if (!serverVerified) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar — fixed */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 bg-slate-950 text-white flex-col z-30">
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
      <aside className={`fixed top-0 left-0 h-screen w-64 bg-slate-950 text-white flex flex-col z-50 transition-transform duration-300 lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent pathname={pathname} onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content — offset by sidebar on desktop */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-950 text-white sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} aria-label="Deschide meniul" aria-expanded={sidebarOpen} className="p-1 rounded hover:bg-slate-700 transition">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <GraduationCap className="text-blue-400 w-5 h-5" />
            <span className="font-bold text-sm">Panou administrator</span>
          </div>
        </div>
        <main className="max-w-6xl 3xl:max-w-[1600px] mx-auto p-4 pb-16 lg:p-6 lg:pb-16">{children}</main>
      </div>
    </div>
  );
}
