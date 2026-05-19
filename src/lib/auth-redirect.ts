import api from '@/lib/api';
import type { Enrollment } from '@/types';

/**
 * After login, if the user was heading to the default dashboard but has no
 * active enrollments (refunded ones don't count), send them to the homepage
 * to browse the catalog instead. Any other `from` (e.g. /checkout) is honored
 * verbatim.
 */
export async function resolvePostLoginDestination(from: string): Promise<string> {
  if (from !== '/dashboard') return from;
  try {
    const res = await api.get<Enrollment[]>('/enrollments');
    const hasActive = res.data.some((e) => e.status !== 'refunded');
    return hasActive ? '/dashboard' : '/';
  } catch {
    return from;
  }
}
