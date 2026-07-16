'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ProductSectionCard } from '@/modules/products/components/product-section-card';
import { themesService } from '@/services/themes.service';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import type { Theme } from '@/modules/themes/types';

export function ThemeDetailPage({ id }: { id: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    themesService.getTheme(id)
      .then((response) => setTheme(response.data))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Failed to load theme.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ProductSectionCard title="Loading">Loading theme…</ProductSectionCard>;
  if (error) return <ProductSectionCard title="Error"><p className="text-red-300">{error}</p></ProductSectionCard>;
  if (!theme) return <EmptyModuleState title="Theme not found" description="This theme is not registered in the internal Theme SDK." />;

  const contentFields = theme.editor.content || [];
  const settingFields = theme.editor.settings || [];

  return (
    <div>
      <PageHeader
        title={theme.name}
        subtitle={`Version ${theme.version} · ${theme.author} · ${theme.source === 'built-in' ? 'Built-in theme' : 'Uploaded theme'}`}
        actions={<Link href="/themes" className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.018] px-3.5 py-2 text-[12px] font-medium text-text no-underline transition hover:border-white/15 hover:bg-panelMuted"><ArrowLeft className="h-4 w-4" />Theme manager</Link>}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <ProductSectionCard title="Theme information">
          <p className="mb-4 text-sm leading-6 text-textMuted">{theme.description}</p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-panelMuted p-4"><dt className="text-[11px] uppercase tracking-[0.12em] text-textMuted">Theme key</dt><dd className="mt-1 font-mono text-text">{theme.key}</dd></div>
            <div className="rounded-xl border border-white/8 bg-panelMuted p-4"><dt className="text-[11px] uppercase tracking-[0.12em] text-textMuted">Editable fields</dt><dd className="mt-1 font-semibold text-text">{contentFields.length + settingFields.length}</dd></div>
          </dl>
          {theme.aliases.length ? <p className="mt-4 text-xs text-textMuted">Compatibility aliases: {theme.aliases.join(', ')}</p> : null}
        </ProductSectionCard>

        <ProductSectionCard title="Theme SDK fields">
          <div className="space-y-4">
            {[...contentFields, ...settingFields].map((field) => (
              <div key={field.path} className="rounded-xl border border-white/8 bg-panelMuted p-4">
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-text">{field.label}</span><span className="rounded-full bg-accent/12 px-2.5 py-1 text-[10px] font-semibold text-accent">{field.type}</span></div>
                <div className="mt-2 font-mono text-[11px] text-textMuted">{field.path}</div>
                {field.description ? <p className="mt-2 text-xs leading-5 text-textMuted">{field.description}</p> : null}
              </div>
            ))}
          </div>
        </ProductSectionCard>
      </div>
    </div>
  );
}
