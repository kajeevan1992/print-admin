'use client';

import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { ThemePreviewPanel } from '@/components/storefront/theme-preview-panel';
import { useTenantTheme } from '@/providers/theme-provider';

function SampleCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{body}</p>
      <button
        type="button"
        className="mt-4 rounded-full px-4 py-2 text-sm font-medium"
        style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
      >
        Primary action
      </button>
    </div>
  );
}

export default function FrontendFoundationPage() {
  const { config } = useTenantTheme();

  return (
    <StorefrontShell
      title="Frontend Foundation"
      subtitle="Theme engine, tenant config, shared storefront shell, and reusable visual tokens for future customer-facing builds."
    >
      <ThemePreviewPanel />

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <SampleCard title="Storefront-ready shell" body="Reusable header, shell, and section framing for the public site." />
        <SampleCard title="White-label theming" body="Preset themes plus client overrides, page variants, and custom CSS support." />
        <SampleCard title="Next build ready" body={`Current tenant: ${config.tenantName}. Next storefront builds can now land on a reusable base.`} />
      </div>
    </StorefrontShell>
  );
}
