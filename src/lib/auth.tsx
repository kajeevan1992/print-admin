'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppRole = 'super_admin' | 'tenant_admin' | 'ops_manager';

export type AppSession = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  company: string;
};

type DemoAccount = AppSession & {
  password: string;
  defaultRoute: string;
};

const SESSION_KEY = 'print-admin.session.v1';

const demoAccounts: DemoAccount[] = [
  {
    id: 'saas-owner',
    name: 'Kajee',
    email: 'owner@printadmin.app',
    password: 'demo123',
    role: 'super_admin',
    company: 'Print Admin SaaS',
    defaultRoute: '/super-admin'
  },
  {
    id: 'tenant-admin',
    name: 'Sophie Patel',
    email: 'admin@northstarprint.co.uk',
    password: 'demo123',
    role: 'tenant_admin',
    company: 'Northstar Print',
    defaultRoute: '/'
  },
  {
    id: 'ops-manager',
    name: 'Liam Carter',
    email: 'ops@northstarprint.co.uk',
    password: 'demo123',
    role: 'ops_manager',
    company: 'Northstar Print',
    defaultRoute: '/workspace'
  }
];

type AuthContextValue = {
  ready: boolean;
  session: AppSession | null;
  accounts: DemoAccount[];
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string; redirectTo?: string }>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): AppSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppSession;
  } catch {
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
      company: account.company
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    }

    setSession(nextSession);
    return { ok: true, redirectTo: account.defaultRoute };
  }

  function signOut() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_KEY);
    }
    setSession(null);
  }

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    session,
    accounts: demoAccounts,
    signIn,
    signOut
  }), [ready, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
