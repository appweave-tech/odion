import { NextResponse, type NextRequest } from 'next/server';

// Sets an httpOnly `odion-device` cookie on first visit. The cookie is the authoritative
// device identity — server actions read it directly via cookies(). Client never sees the
// value (httpOnly), so a malicious client cannot impersonate another device by passing
// arbitrary UUIDs to server actions.
//
// Edge Runtime exposes Web Crypto via globalThis.crypto.randomUUID (no node:crypto).
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get('odion-device')) {
    res.cookies.set('odion-device', crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 2, // 2 years
    });
  }
  return res;
}

export const config = {
  // Skip static + image + favicon to keep cookies clean from asset requests.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)'],
};
