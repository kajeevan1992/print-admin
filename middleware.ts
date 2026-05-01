import { NextRequest, NextResponse } from 'next/server';

const RESERVED_PREFIXES = [
  '/api',
  '/_next',
  '/admin',
  '/app',
  '/account-dashboard',
  '/products',
  '/categories',
  '/orders',
  '/settings',
  '/super-admin',
  '/theme',
  '/storefront',
];

function wantsHostedTheme(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get('host') || '';
  const mode = url.searchParams.get('hostedTheme') || request.headers.get('x-print-hosted-theme');
  return mode === '1' || mode === 'true' || host.startsWith('theme.') || host.startsWith('store.');
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  if (!wantsHostedTheme(request)) return NextResponse.next();
  if (RESERVED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return NextResponse.next();

  if (pathname === '/') {
    const rewriteUrl = url.clone();
    rewriteUrl.pathname = '/theme/atlantis';
    return NextResponse.rewrite(rewriteUrl);
  }

  if (pathname.startsWith('/category/') || pathname.startsWith('/product/') || pathname === '/cart' || pathname === '/checkout') {
    return NextResponse.next();
  }

  const rewriteUrl = url.clone();
  rewriteUrl.pathname = `/theme/atlantis${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
