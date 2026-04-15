'use client';

import type { ReactNode } from 'react';
import { useTenantTheme } from '@/providers/theme-provider';

export function StorefrontShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode; }) {
  const { config, tokens } = useTenantTheme();

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--theme-bg)',
        color: 'var(--theme-text)',
        fontFamily: 'var(--theme-font-sans)'
      }}
    >
      <header
        className="border-b px-6 py-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em]" style={{ color: 'var(--theme-text-muted)' }}>
              {config.tenantName} · {tokens.name}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{subtitle}</p>
          </div>
          <div
            className="rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
          >
            Theme-ready storefront shell
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
