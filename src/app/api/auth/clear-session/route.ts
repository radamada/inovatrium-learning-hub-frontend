import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.redirect(
    process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
      : 'http://localhost:3000/login',
  );
  // Ștergem ambele cookies (setate de backend pe același localhost)
  response.cookies.set('user_role', '', { maxAge: 0, path: '/' });
  response.cookies.set('refresh_token', '', { maxAge: 0, path: '/api/auth/refresh' });
  return response;
}
