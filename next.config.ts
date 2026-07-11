import type { NextConfig } from "next";

const IS_PROD = process.env.NODE_ENV === 'production';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ── Content Security Policy ──────────────────────────────────────────────────
// Note: Next.js generează inline scripts pentru hidratare; folosim 'unsafe-inline'
// pentru script-src ca să nu spargem app-ul. Migrarea la nonce-based CSP necesită
// middleware separat și e tracked ca task viitor.
// În dev folosim un CSP mai permisiv (HMR are nevoie de 'unsafe-eval' + ws:).
const cspDev = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.b-cdn.net https://*.bunnycdn.com https://res.cloudinary.com https://images.unsplash.com http://localhost:*",
  // Media: blob: pentru MSE (hls.js) + Bunny Stream CDN pentru fallback-ul HLS nativ (Safari)
  "media-src 'self' blob: https://*.b-cdn.net",
  "font-src 'self' data:",
  // Connect: API, Stripe, HMR websocket, Bunny Stream CDN (hls.js descarcă .m3u8 + segmente)
  `connect-src 'self' ${API_URL} https://api.stripe.com https://*.b-cdn.net ws://localhost:* http://localhost:*`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const cspProd = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.b-cdn.net https://*.bunnycdn.com https://res.cloudinary.com https://images.unsplash.com",
  // Media: blob: pentru MSE (hls.js) + Bunny Stream CDN pentru fallback-ul HLS nativ (Safari)
  "media-src 'self' blob: https://*.b-cdn.net",
  "font-src 'self' data:",
  `connect-src 'self' ${API_URL} https://api.stripe.com https://*.b-cdn.net`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

// ── Headers de securitate aplicate pe toate response-urile FE ────────────────
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
  },
  {
    key: 'Content-Security-Policy',
    value: IS_PROD ? cspProd : cspDev,
  },
  // HSTS doar în prod — în dev am rula pe HTTP, iar HSTS ar lock-ui browser-ul
  // pe HTTPS-only pentru localhost și ar sparge următoarele sesiuni dev.
  ...(IS_PROD
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ['madalinr.local'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: '**.bunnycdn.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
