'use client';

import { useMemo } from 'react';
import type { PageSchema } from '@/storefront/editor/page-schema';
import {
  clearSavedStorefrontPageConfig,
  loadSavedStorefrontPageConfig,
  saveStorefrontPageConfig
} from '@/components/editor/page-config-storage';

export function PageConfigToolbar({
  page,
  onLoad,
  onReset
}: {
  page: PageSchema;
  onLoad: (page: PageSchema) => void;
  onReset: () => void;
}) {
  const prettyJson = useMemo(() => JSON.stringify(page, null, 2), [page]);

  function handleSave() {
    saveStorefrontPageConfig(page);
  }

  function handleLoad() {
    const saved = loadSavedStorefrontPageConfig();
    if (saved) onLoad(saved);
  }

  async function handleExport() {
    if (typeof window === 'undefined') return;
    try {
      await window.navigator.clipboard.writeText(prettyJson);
    } catch {}
  }

  function handleClear() {
    clearSavedStorefrontPageConfig();
  }

  return (
    <div
      className="rounded-3xl border p-4"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="mb-3">
        <p className="text-sm font-semibold">Page config</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Save the current page schema, load it back, reset to demo content, || copy JSON for future persistence.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
        >
          Save config
        </button>
        <button
          type="button"
          onClick={handleLoad}
          className="rounded-full border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
        >
          Load saved
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-full border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
        >
          Copy JSON
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
        >
          Reset demo
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-full border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
        >
          Clear saved
        </button>
      </div>

      <pre
        className="mt-4 max-h-[260px] overflow-auto rounded-2xl border p-3 text-xs"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
      >
        {prettyJson}
      </pre>
    </div>
  );
}
