import { NextRequest, NextResponse } from 'next/server';

const RESERVED_PREFIXES = [
  '/api', '/_next', '/admin', '/app', '/account-dashboard', '/products', '/categories', '/orders', '/settings', '/super-admin', '/theme', '/storefront',
];
const PROTECTED_PAGE_PREFIXES = [
  '/',
  '/workspace',
  '/super-admin',
  '/products',
  '/categories',
  '/orders',
  '/settings',
  '/tenant-control',
  '/shop-login-setup',
  '/memberships',
  '/fresh-db-setup',
  '/admin-users',
  '/api-keys',
  '/credentials',
  '/security-events',
  '/oauth',
  '/database-manager',
  '/launch',
  '/first-live-order-monitor',
  '/post-launch-health',
  '/final-launch-blockers',
  '/production-smoke-test',
  '/storefront-content-readiness',
  '/artwork-preflight',
  '/artwork-uploads',
  '/artwork-proofing',
  '/design-briefs',
  '/production-planner',
  '/dispatch-center',
  '/email-outbox',
  '/email-order-notification-qa',
  '/payment-checkout-qa',
  '/live-flow-check',
  '/admin-launch-security',
  '/button-audit',
  '/data-continuity',
  '/final-check',
];
const PUBLIC_PAGE_PREFIXES = ['/login', '/logout', '/accept-invite', '/theme', '/storefront', '/product', '/category', '/cart', '/checkout', '/track-order', '/proof-action', '/design-brief', '/payment-success', '/payment-cancel'];
const PUBLIC_INTERNAL_PREFIXES = ['/api/internal/auth/', '/api/internal/storefront/', '/api/internal/catalog/', '/api/internal/seo/', '/api/internal/config/'];
const DEFAULT_STOREFRONT_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'https://hosted-theme.vercel.app', 'http://gvlasyi01xyshahhxvvsot1u.13.61.22.39.sslip.io', 'https://gvlasyi01xyshahhxvvsot1u.13.61.22.39.sslip.io'];

function envOrigins() { return [process.env.CORS_ORIGIN, process.env.CORS_ORIGINS, process.env.ALLOWED_ORIGINS, process.env.STOREFRONT_URL, process.env.NEXT_PUBLIC_STOREFRONT_URL].filter(Boolean).flatMap((value) => String(value).split(',')).map((value) => value.trim().replace(/\/$/, '')).filter(Boolean); }
function allowedStorefrontOrigins() { return new Set([...DEFAULT_STOREFRONT_ORIGINS, ...envOrigins()].map((value) => value.replace(/\/$/, ''))); }
function cleanHost(request: NextRequest) { return String(request.headers.get('host') || '').toLowerCase().replace(/:\d+$/, ''); }
function isCustomStoreHost(request: NextRequest) { const host = cleanHost(request); if (!host || host.includes('localhost') || host.includes('vercel.app') || host.includes('print-admin')) return false; return host.includes('.'); }
function wantsHostedTheme(request: NextRequest) { const url = request.nextUrl; const host = cleanHost(request); const mode = url.searchParams.get('hostedTheme') || request.headers.get('x-print-hosted-theme'); return mode === '1' || mode === 'true' || host.startsWith('theme.') || host.startsWith('store.') || isCustomStoreHost(request); }
function isInternalStorefrontApi(pathname: string) { return PUBLIC_INTERNAL_PREFIXES.some((prefix) => pathname.startsWith(prefix)); }
function hasAdminCookie(request: NextRequest) { return Boolean(request.cookies.get('print_admin_session')?.value); }
function isPublicPage(pathname: string) { return PUBLIC_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)); }
function isProtectedPage(pathname: string) { if (pathname.startsWith('/api') || pathname.startsWith('/_next')) return false; if (isPublicPage(pathname)) return false; return PROTECTED_PAGE_PREFIXES.some((prefix) => prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`)); }
function withCors(request: NextRequest, response: NextResponse) { const origin = (request.headers.get('origin') || '').replace(/\/$/, ''); if (!origin || !allowedStorefrontOrigins().has(origin)) return response; response.headers.set('Access-Control-Allow-Origin', origin); response.headers.set('Access-Control-Allow-Credentials', 'true'); response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS'); response.headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type, Authorization, X-Requested-With, X-Print-Tenant, X-Print-Hosted-Theme, X-Tenant-Id, X-Site-Id'); response.headers.set('Access-Control-Max-Age', '86400'); response.headers.set('Vary', 'Origin'); return response; }
function hostedThemeResponse(request: NextRequest, pathname: string, url: NextRequest['nextUrl']) { if (!wantsHostedTheme(request)) return null; if (RESERVED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null; if (pathname === '/') { const rewriteUrl = url.clone(); rewriteUrl.pathname = '/theme/atlantis'; rewriteUrl.searchParams.set('host', cleanHost(request)); return NextResponse.rewrite(rewriteUrl); } if (pathname.startsWith('/category/') || pathname.startsWith('/product/') || pathname === '/cart' || pathname === '/checkout') return NextResponse.next(); const rewriteUrl = url.clone(); rewriteUrl.pathname = `/theme/atlantis${pathname === '/' ? '' : pathname}`; rewriteUrl.searchParams.set('host', cleanHost(request)); return NextResponse.rewrite(rewriteUrl); }

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
  const hosted = hostedThemeResponse(request, pathname, url);
  if (hosted) return hosted;
  if (pathname.startsWith('/api/internal/') && !isInternalStorefrontApi(pathname) && !hasAdminCookie(request)) return NextResponse.json({ ok: false, error: 'Admin session required.' }, { status: 401 });
  if (isProtectedPage(pathname) && !hasAdminCookie(request)) { const loginUrl = url.clone(); loginUrl.pathname = '/login'; loginUrl.searchParams.set('next', pathname); return NextResponse.redirect(loginUrl); }
  if (isInternalStorefrontApi(pathname)) { if (request.method === 'OPTIONS') return withCors(request, new NextResponse(null, { status: 204 })); return withCors(request, NextResponse.next()); }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
