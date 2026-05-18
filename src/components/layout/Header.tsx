'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { GraduationCap, ShoppingCart, LogOut, LayoutDashboard, Shield, BookOpenCheck, Library, BookMarked, Menu, X, Heart, UserCircle, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { useThemeStore } from '@/stores/theme.store';
import CartSheet from '@/components/cart/CartSheet';
import NotificationBell from '@/components/layout/NotificationBell';
import { useState, useEffect, useRef } from 'react';

export default function Header() {
  const { user, logout, isHydrated } = useAuthStore();
  const { itemCount } = useCartStore();
  const { dark, toggle: toggleTheme } = useThemeStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const closeMobile = () => setMobileOpen(false);

  // Închide meniul mobil la click în afara lui
  useEffect(() => {
    if (!mobileOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [mobileOpen]);

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200/60 dark:border-gray-700/60">
      <div className="w-full px-4 sm:px-6 lg:px-8 3xl:px-12 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <GraduationCap className="text-blue-600 w-7 h-7" />
          <span className="text-xl font-bold text-gray-900">
            Ino<span className="text-indigo-600">versity</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/courses"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
              pathname === '/courses'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Library className="w-4 h-4" />
            Cursuri
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                pathname === '/dashboard'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <BookMarked className="w-4 h-4" />
              Cursurile mele
            </Link>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          {user && <NotificationBell />}

          {/* Cart */}
          {user && (
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Deschide coșul de cumpărături"
            >
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {itemCount() > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                  {itemCount()}
                </Badge>
              )}
            </button>
          )}

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Meniu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* User dropdown or Login */}
          {!isHydrated ? (
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user.name}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem render={<Link href="/dashboard" />} className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Cursurile mele
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/wishlist" />} className="flex items-center gap-2">
                  <Heart className="w-4 h-4" /> Salvate
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/profile" />} className="flex items-center gap-2">
                  <UserCircle className="w-4 h-4" /> Profilul meu
                </DropdownMenuItem>
                {user.role === 'instructor' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem render={<Link href="/instructor" />} className="flex items-center gap-2">
                      <BookOpenCheck className="w-4 h-4" /> Panou formator
                    </DropdownMenuItem>
                  </>
                )}
                {user.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem render={<Link href="/admin" />} className="flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Panou administrator
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={toggleTheme}
                  className="flex items-center gap-2"
                >
                  {dark
                    ? <><Sun className="w-4 h-4 text-yellow-500" /> Mod luminos</>
                    : <><Moon className="w-4 h-4" /> Mod întunecat</>
                  }
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-red-600 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Delogare
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors">
                Conectează-te
              </Link>
              <Link href="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                Înscrie-te
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div ref={mobileMenuRef} className="md:hidden border-t border-gray-100 bg-white dark:bg-gray-900 px-4 py-3 flex flex-col gap-1">
          <Link
            href="/courses"
            onClick={closeMobile}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/courses' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Library className="w-4 h-4" /> Cursuri
          </Link>
          {user && (
            <Link
              href="/dashboard"
              onClick={closeMobile}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/dashboard' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BookMarked className="w-4 h-4" /> Cursurile mele
            </Link>
          )}
          {user && (
            <Link
              href="/wishlist"
              onClick={closeMobile}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/wishlist' ? 'text-red-500 bg-red-50' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Heart className="w-4 h-4" /> Salvate
            </Link>
          )}
          {user && (
            <Link
              href="/profile"
              onClick={closeMobile}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/profile' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UserCircle className="w-4 h-4" /> Profilul meu
            </Link>
          )}
          {user?.role === 'instructor' && (
            <Link
              href="/instructor"
              onClick={closeMobile}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <BookOpenCheck className="w-4 h-4" /> Panou formator
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              onClick={closeMobile}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Shield className="w-4 h-4" /> Panou administrator
            </Link>
          )}
          {!user && (
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 mt-1">
              <Link
                href="/login"
                onClick={closeMobile}
                className="text-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Conectează-te
              </Link>
              <Link
                href="/register"
                onClick={closeMobile}
                className="text-center px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Înscrie-te
              </Link>
            </div>
          )}
          {user && (
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              {dark
                ? <><Sun className="w-4 h-4 text-yellow-500" /> Mod luminos</>
                : <><Moon className="w-4 h-4" /> Mod întunecat</>
              }
            </button>
          )}
          {user && (
            <button
              onClick={() => { logout(); closeMobile(); }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-1 border-t border-gray-100 pt-3"
            >
              <LogOut className="w-4 h-4" /> Delogare
            </button>
          )}
        </div>
      )}

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
