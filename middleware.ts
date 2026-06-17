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

const DEFAULT_STOREFRONT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://hosted-theme.vercel.app',
  'http://gvlasyi01xyshahhxvvsot1u.13.61.22.39.sslip.io',
  'https://gvlasyi01xyshahhxvvsot1u.13.61.22.39.sslip.io',
];

function envOrigins() {
  return [
    process.env.CORS_ORIGIN,
    process.env.CORS_ORIGINS,
    process.env.ALLOWED_ORIGINS,
    process.env.STOREFRONT_URL,
    process.env.NEXT_PUBLIC_STOREFRONT_URL,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function allowedStorefrontOrigins() {
  return new Set([...DEFAULT_STOREFRONT_ORIGINS, ...envOrigins()].map((value) => value.replace(/\/$/, '')));
}

function wantsHostedTheme(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get('host') || '';
  const mode = url.searchParams.get('hostedTheme') || request.headers.get('x-print-hosted-theme');
  return mode === '1' || mode === 'true' || host.startsWith('theme.') || host.startsWith('store.');
}

function isInternalStorefrontApi(pathname: string) {
  return (
    pathname.startsWith('/api/internal/storefront/') ||
    pathname.startsWith('/api/internal/catalog/') ||
    pathname.startsWith('/api/internal/seo/')
  );
}

function withCors(request: NextRequest, response: NextResponse) {
  const origin = (request.headers.get('origin') || '').replace(/\/$/, '');
  if (!origin || !allowedStorefrontOrigins().has(origin)) return response;
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type, Authorization, X-Requested-With, X-Print-Tenant, X-Print-Hosted-Theme, X-Tenant-Id, X-Site-Id');
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Vary', 'Origin');
  return response;
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  if (isInternalStorefrontApi(pathname)) {
    if (request.method === 'OPTIONS') {
      return withCors(request, new NextResponse(null, { status: 204 }));
    }
    return withCors(request, NextResponse.next());
  }

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
