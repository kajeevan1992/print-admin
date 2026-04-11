'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminShell } from './admin-shell';
import { LoginScreen } from '@/components/auth/login-screen';
import { AccessDenied } from '@/components/auth/access-denied';
import { useAuth } from '@/lib/auth';

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, session, signOut } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (pathname === '/logout') {
      signOut();
      router.replace('/login');
      return;
    }
    if (pathname === '/login' && session) {
      router.replace(session.role === 'super_admin' ? '/super-admin' : '/');
    }
  }, [pathname, ready, router, session, signOut]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-textMuted">
        Preparing workspace…
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (pathname === '/login' || pathname === '/logout') {
    return <div className="flex min-h-screen items-center justify-center bg-background text-textMuted">Redirecting…</div>;
  }

  if ((pathname ?? '').startsWith('/super-admin') && session.role !== 'super_admin') {
    return (
      <AdminShell>
        <AccessDenied />
      </AdminShell>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
