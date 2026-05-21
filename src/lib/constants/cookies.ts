// Numele cookie-ului care păstrează rolul userului pe origin-ul frontend (Next.js).
// În production folosim prefix `__Host-` (cere Secure + Path=/ + fără Domain) pentru
// hardening; în dev pe HTTP browser-ul ar refuza `__Host-`, deci folosim numele plain.
// Trebuie ținut sincronizat între `auth.store.ts`, `proxy.ts` și `api/auth/clear-session`.
export const IS_PROD = process.env.NODE_ENV === 'production';

export const USER_ROLE_COOKIE = IS_PROD ? '__Host-user_role' : 'user_role';
