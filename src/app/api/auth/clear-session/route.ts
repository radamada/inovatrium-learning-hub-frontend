import { NextResponse } from 'next/server';

const IS_PROD = process.env.NODE_ENV === 'production';

// Must mirror backend cookie-names.const.ts
const REFRESH_TOKEN_COOKIE = IS_PROD ? '__Host-refresh_token' : 'refresh_token';
const USER_ROLE_COOKIE     = IS_PROD ? '__Host-user_role'     : 'user_role';

export async function GET() {
  const response = NextResponse.redirect(
    process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
      : 'http://localhost:3000/login',
  );

  // Clear current cookies (prod __Host- or dev plain names)
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', { maxAge: 0, path: '/' });
  response.cookies.set(USER_ROLE_COOKIE, '', { maxAge: 0, path: '/' });

  // Safety net: also clear legacy plain-name cookies so old sessions
  // don't linger after a prod → dev environment switch or a first deploy
  if (REFRESH_TOKEN_COOKIE !== 'refresh_token') {
    response.cookies.set('refresh_token', '', { maxAge: 0, path: '/' });
  }
  if (USER_ROLE_COOKIE !== 'user_role') {
    response.cookies.set('user_role', '', { maxAge: 0, path: '/' });
  }

  return response;
}
