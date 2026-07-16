'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminShell } from './admin-shell';
import { LoginScreen } from '@/components/auth/login-screen';
import { AccessDenied } from '@/components/auth/access-denied';
import { AppErrorBoundary } from './app-error-boundary';
import { useAuth } from '@/lib/auth';

const PUBLIC_PAGES = ['/accept-invite', '/stores', '/theme/atlantis', '/native-stores'];
function isPublicPage(pathname?: string | null) { return Boolean(pathname && PUBLIC_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))); }

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authContext = useAuth();
  const ready = authContext?.ready ?? false;
  const session = authContext?.session ?? null;
  const signOut = authContext?.signOut ?? (() => {});

  useEffect(() => {
    if (!ready) return;
    if (pathname === '/logout') { signOut(); router.replace('/login'); return; }
    if (pathname === '/login' && session) router.replace(session.role === 'super_admin' ? '/super-admin' : '/workspace');
  }, [pathname, ready, router, session, signOut]);

  if (isPublicPage(pathname)) return <AppErrorBoundary>{children}</AppErrorBoundary>;
  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-background text-textMuted">Preparing workspace…</div>;
  if (!session) return <AppErrorBoundary><LoginScreen /></AppErrorBoundary>;
  if (pathname === '/login' || pathname === '/logout') return <div className="flex min-h-screen items-center justify-center bg-background text-textMuted">Redirecting…</div>;
  if ((pathname ?? '').startsWith('/super-admin') && session.role !== 'super_admin') return <AppErrorBoundary><AdminShell><AccessDenied /></AdminShell></AppErrorBoundary>;
  return <AppErrorBoundary><AdminShell>{children}</AdminShell></AppErrorBoundary>;
}
