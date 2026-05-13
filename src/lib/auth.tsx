'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppRole = 'super_admin' | 'tenant_admin' | 'ops_manager';

export type AppSession = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  company: string;
  tenantId: string;
};

type DemoAccount = AppSession & {
  password: string;
  defaultRoute: string;
};

const SESSION_KEY = 'print-admin.session.v1';

function safeSessionWrite(session: AppSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore browser storage failures and rely on in-memory session
  }
}

const demoAccounts: DemoAccount[] = [
  {
    id: 'saas-owner',
    name: 'Kajee',
    email: 'owner@printadmin.app',
    password: 'demo123',
    role: 'super_admin',
    company: 'Print Admin SaaS',
    tenantId: 'owner-console',
    defaultRoute: '/super-admin'
  },
  {
    id: 'tenant-admin',
    name: 'Sophie Patel',
    email: 'admin@northstarprint.co.uk',
    password: 'demo123',
    role: 'tenant_admin',
    company: 'Northstar Print',
    tenantId: 'northstar-print',
    defaultRoute: '/workspace'
  },
  {
    id: 'ops-manager',
    name: 'Liam Carter',
    email: 'ops@northstarprint.co.uk',
    password: 'demo123',
    role: 'ops_manager',
    company: 'Northstar Print',
    tenantId: 'northstar-print',
    defaultRoute: '/workspace'
  }
];

type AuthContextValue = {
  ready: boolean;
  session: AppSession | null;
  accounts: DemoAccount[];
  auth: {
    ready: boolean;
    session: AppSession | null;
    user: AppSession | null;
    role: AppRole | null;
    tenantId: string | null;
    isAuthenticated: boolean;
  };
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string; redirectTo?: string }>;
  signOut: () => void;
};

const fallbackAuthContext: AuthContextValue = {
  ready: false,
  session: null,
  accounts: demoAccounts,
  auth: {
    ready: false,
    session: null,
    user: null,
    role: null,
    tenantId: null,
    isAuthenticated: false
  },
  signIn: async () => ({ ok: false, error: 'Authentication is not ready yet.' }),
  signOut: () => {}
};

const AuthContext = createContext<AuthContextValue>(fallbackAuthContext);

function normaliseSession(value: unknown): AppSession | null {
  if (!value || typeof value !== 'object') return null;
  const session = value as Partial<AppSession>;
  if (!session.id || !session.email || !session.role) return null;
  return {
    id: String(session.id),
    name: String(session.name || session.email),
    email: String(session.email),
    role: session.role === 'super_admin' || session.role === 'tenant_admin' || session.role === 'ops_manager' ? session.role : 'tenant_admin',
    company: String(session.company || 'Print Admin'),
    tenantId: String(session.tenantId || 'northstar-print')
  };
}

function readSession(): AppSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return normaliseSession(JSON.parse(raw));
  } catch {
    safeSessionWrite(null);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AppSession | null>(null);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  async function signIn(email: string, password: string) {
    const account = demoAccounts.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!account || account.password !== password) {
      return { ok: false, error: 'Use one of the demo accounts shown on the login screen.' };
    }

    const nextSession: AppSession = {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      company: account.company,
      tenantId: account.tenantId
    };

    safeSessionWrite(nextSession);
    setSession(nextSession);
    return { ok: true, redirectTo: account.defaultRoute };
  }

  function signOut() {
    safeSessionWrite(null);
    setSession(null);
  }

  const value = useMemo<AuthContextValue>(() => {
    const auth = {
      ready,
      session,
      user: session,
      role: session?.role ?? null,
      tenantId: session?.tenantId ?? null,
      isAuthenticated: Boolean(session)
    };

    return {
      ready,
      session,
      accounts: demoAccounts,
      auth,
      signIn,
      signOut
    };
  }, [ready, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function updateSession(patch: Partial<AppSession>) {
  const current = readSession();
  if (!current) return null;
  const nextSession = normaliseSession({ ...current, ...patch });
  if (!nextSession) return null;
  safeSessionWrite(nextSession);
  return nextSession;
}

export function useAuth() {
  return useContext(AuthContext) ?? fallbackAuthContext;
}
