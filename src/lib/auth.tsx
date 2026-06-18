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

const SESSION_KEY = 'print-admin.session.v2';
const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true';

function safeSessionWrite(session: AppSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore browser storage failures and rely on in-memory session
  }
}

export function updateSession(changes: Partial<AppSession>) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const current = normaliseSession(JSON.parse(raw));
    if (!current) return null;
    const next = normaliseSession({ ...current, ...changes });
    if (next) safeSessionWrite(next);
    return next;
  } catch {
    return null;
  }
}

function demoAccountsFromEnv(): DemoAccount[] {
  if (!DEMO_LOGIN_ENABLED) return [];
  const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD || '';
  if (!password) return [];
  return [
    { id: 'demo-owner', name: process.env.NEXT_PUBLIC_DEMO_OWNER_NAME || 'Demo Owner', email: process.env.NEXT_PUBLIC_DEMO_OWNER_EMAIL || 'owner@example.com', password, role: 'super_admin', company: process.env.NEXT_PUBLIC_DEMO_OWNER_COMPANY || 'Print Admin SaaS', tenantId: process.env.NEXT_PUBLIC_DEMO_OWNER_TENANT || 'owner-console', defaultRoute: '/super-admin' },
    { id: 'demo-tenant-admin', name: process.env.NEXT_PUBLIC_DEMO_TENANT_NAME || 'Demo Tenant Admin', email: process.env.NEXT_PUBLIC_DEMO_TENANT_EMAIL || 'admin@example.com', password, role: 'tenant_admin', company: process.env.NEXT_PUBLIC_DEMO_TENANT_COMPANY || 'Demo Print Shop', tenantId: process.env.NEXT_PUBLIC_DEMO_TENANT_ID || process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || 'holo-print', defaultRoute: '/workspace' },
  ];
}

const demoAccounts = demoAccountsFromEnv();

type AuthContextValue = {
  ready: boolean;
  session: AppSession | null;
  accounts: DemoAccount[];
  auth: { ready: boolean; session: AppSession | null; user: AppSession | null; role: AppRole | null; tenantId: string | null; isAuthenticated: boolean };
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string; redirectTo?: string }>;
  signOut: () => void;
};

const fallbackAuthContext: AuthContextValue = {
  ready: false,
  session: null,
  accounts: demoAccounts,
  auth: { ready: false, session: null, user: null, role: null, tenantId: null, isAuthenticated: false },
  signIn: async () => ({ ok: false, error: 'Authentication is not ready yet.' }),
  signOut: () => {}
};

const AuthContext = createContext<AuthContextValue>(fallbackAuthContext);

function normaliseSession(value: unknown): AppSession | null {
  if (!value || typeof value !== 'object') return null;
  const session = value as Partial<AppSession>;
  if (!session.id || !session.email || !session.role) return null;
  return { id: String(session.id), name: String(session.name || session.email), email: String(session.email), role: session.role === 'super_admin' || session.role === 'tenant_admin' || session.role === 'ops_manager' ? session.role : 'tenant_admin', company: String(session.company || 'Print Admin'), tenantId: String(session.tenantId || process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || 'holo-print') };
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

async function signInViaDatabase(email: string, password: string) {
  try {
    const response = await fetch('/api/internal/auth/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) return { ok: false, error: payload?.error || 'Login failed.' };
    const session = normaliseSession(payload.session);
    if (!session) return { ok: false, error: 'Login returned an invalid session.' };
    return { ok: true, session, redirectTo: String(payload.redirectTo || (session.role === 'super_admin' ? '/super-admin' : '/workspace')) };
  } catch {
    return { ok: false, error: 'Database login is currently unavailable. Check DATABASE_URL / Neon connection and redeploy.' };
  }
}

function signInViaDemo(email: string, password: string) {
  if (!DEMO_LOGIN_ENABLED) return null;
  const account = demoAccounts.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
  if (!account || account.password !== password) return null;
  const nextSession: AppSession = { id: account.id, name: account.name, email: account.email, role: account.role, company: account.company, tenantId: account.tenantId };
  return { ok: true, session: nextSession, redirectTo: account.defaultRoute };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AppSession | null>(null);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  async function signIn(email: string, password: string) {
    const databaseResult = await signInViaDatabase(email, password);
    if (databaseResult.ok && databaseResult.session) {
      safeSessionWrite(databaseResult.session);
      setSession(databaseResult.session);
      return { ok: true, redirectTo: databaseResult.redirectTo };
    }
    const demoResult = signInViaDemo(email, password);
    if (demoResult?.ok && demoResult.session) {
      safeSessionWrite(demoResult.session);
      setSession(demoResult.session);
      return { ok: true, redirectTo: demoResult.redirectTo };
    }
    return { ok: false, error: databaseResult.error || 'Invalid email or password.' };
  }

  function signOut() {
    safeSessionWrite(null);
    setSession(null);
  }

  const value = useMemo<AuthContextValue>(() => {
    const auth = { ready, session, user: session, role: session?.role ?? null, tenantId: session?.tenantId ?? null, isAuthenticated: Boolean(session) };
    return { ready, session, accounts: demoAccounts, auth, signIn, signOut };
  }, [ready, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
export function useAuthSession() { const context = useAuth(); return context.session; }
