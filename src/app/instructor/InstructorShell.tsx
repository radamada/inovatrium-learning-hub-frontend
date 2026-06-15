'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, LayoutDashboard, BookOpen, ShoppingBag, Ticket, ArrowLeft, Menu } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/instructor', label: 'General', icon: LayoutDashboard, exact: true },
  { href: '/instructor/courses', label: 'Cursurile mele', icon: BookOpen },
  { href: '/instructor/orders', label: 'Comenzi', icon: ShoppingBag },
  { href: '/instructor/coupons', label: 'Cupoane', icon: Ticket },
];

function SidebarContent({ user, pathname, onNavClick }: { user: any; pathname: string; onNavClick?: () => void }) {
  return (
    <>
      <div className="p-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-blue-400 w-6 h-6" />
          <span className="font-bold text-slate-100">Panou Formator</span>
        </div>
        <p className="text-xs text-slate-400 mt-1 truncate">{user.name}</p>
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

/**
 * Shell-ul interactiv al panoului instructor. Layout-ul părinte (server component)
 * a confirmat deja cookie-ul user_role server-side; aici facem și check client-side
 * pe baza store-ului persistat (localStorage) ca double-defense împotriva unei
 * stări inconsistente între cookie și auth-store.
 */
export default function InstructorShell({ children }: { children: React.ReactNode }) {
  const { user, isHydrated, fetchMe } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // `role` nu mai e persistat în localStorage (vezi auth.store) => imediat după
  // hidratare poate fi nedefinit. NU redirecta pe rol nedefinit (ar arunca afară
  // instructorul la fiecare hard-load); re-verifică server-side cu fetchMe și
  // decide pe rolul proaspăt. Adminul are și el acces (paritate cu middleware-ul).
  const [serverVerified, setServerVerified] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    fetchMe()
      .then(() => {
        if (cancelled) return;
        const fresh = useAuthStore.getState().user;
        if (!fresh) router.push('/login');
        else if (fresh.role !== 'instructor' && fresh.role !== 'admin') router.push('/');
        else setServerVerified(true);
      })
      .catch(() => { if (!cancelled) router.push('/login'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, pathname]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!isHydrated) return null;
  if (!user) return null;
  if (!serverVerified) return null;

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-950 text-white flex-col flex-shrink-0">
        <SidebarContent user={user} pathname={pathname} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-950 text-white flex flex-col z-50 transition-transform duration-300 lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent user={user} pathname={pathname} onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-950 text-white">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded hover:bg-slate-700 transition">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <GraduationCap className="text-blue-400 w-5 h-5" />
            <span className="font-bold text-sm">Panou Formator</span>
          </div>
        </div>
        <div className="max-w-6xl 3xl:max-w-[1600px] mx-auto p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
