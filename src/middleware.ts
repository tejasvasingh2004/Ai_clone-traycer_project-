// middleware.ts — Route-level auth guard for Next.js App Router
// Replaces Express verifyAccessToken as a global gate (HLD §4).
// app/api/auth/* routes are explicitly EXCLUDED — they must remain public.
//
// IMPORTANT: Next.js middleware runs in the Edge runtime, which does NOT support
// Node.js-specific APIs (node:crypto, jsonwebtoken). We use 'jose' here — a
// Web Crypto API-compatible JWT library. The route handlers (lib/jwt.ts) continue
// to use jsonwebtoken since they run in the Node.js runtime (not Edge).

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that are explicitly public (no token required)
const PUBLIC_PATHS = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
];

// Protected route prefix — any /api/* not in PUBLIC_PATHS requires a valid access token
const PROTECTED_PREFIX = '/api/';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Not an API route — let through (UI routes, static assets)
  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  // Explicitly public auth endpoints — always let through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // All other /api/* routes require a valid access token
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.split(' ')[1];
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'traycer_super_secret_key_change_in_production'
  );

  try {
    const { payload } = await jwtVerify(token, secret);

    // Forward user context as request headers for downstream route handlers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', (payload.userId as string) ?? '');
    requestHeaders.set('x-username', (payload.username as string) ?? '');

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

export const config = {
  // Match all API routes — middleware does its own path filtering above
  matcher: ['/api/:path*'],
};
