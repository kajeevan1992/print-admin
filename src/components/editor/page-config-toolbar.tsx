'use client';

import { useMemo } from 'react';
import type { PageSchema } from '@/storefront/editor/page-schema';

const STORAGE_KEY = 'printcore.storefront-editor.page-config';

export function loadSavedPageConfig(): PageSchema | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PageSchema;
  } catch {
    return null;
  }
}

export function savePageConfig(page: PageSchema) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(page));
}

export function clearSavedPageConfig() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

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
    savePageConfig(page);
  }

  function handleLoad() {
    const saved = loadSavedPageConfig();
    if (saved) onLoad(saved);
  }

  function handleExport() {
    if (typeof window === 'undefined') return;
    window.navigator.clipboard.writeText(prettyJson);
  }

  function handleClear() {
    clearSavedPageConfig();
  }

  return (
    <div
      className="rounded-3xl border p-4"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="mb-3">
        <p className="text-sm font-semibold">Page config</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Save the current page schema, load it back, reset to demo content, or copy JSON for future persistence.
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
