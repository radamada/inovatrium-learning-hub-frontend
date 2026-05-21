import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { USER_ROLE_COOKIE } from '@/lib/constants/cookies';
import InstructorShell from './InstructorShell';

/**
 * Server-side gate pentru tot /instructor/*. Citește cookie-ul user_role
 * (același pe care îl validează middleware-ul) și redirect-ează imediat
 * dacă rolul nu e 'instructor'. Verificarea finală de auth rămâne pe
 * BE-side (JwtAuthGuard + RolesGuard la nivel de API), aici lucrăm pentru
 * defense in depth: un al doilea filtru server-side înainte ca SSR-ul să
 * randeze pagina, în plus față de middleware și de check-ul client din shell.
 */
export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const role = cookieStore.get(USER_ROLE_COOKIE)?.value;

  if (!role) {
    redirect('/login?from=/instructor');
  }
  if (role !== 'instructor') {
    redirect('/');
  }

  return <InstructorShell>{children}</InstructorShell>;
}
