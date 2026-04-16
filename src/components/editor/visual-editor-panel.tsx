'use client';

import { PageSchema } from '@/storefront/editor/page-schema';

export function VisualEditorPanel({
  page,
  onChange
}: {
  page: PageSchema;
  onChange: (page: PageSchema) => void;
}) {
  function updateSection(id: string, key: string, value: string) {
    const updated = {
      ...page,
      sections: page.sections.map((section) =>
        section.id === id
          ? {
              ...section,
              props: {
                ...section.props,
                [key]: value
              }
            }
          : section
      )
    };
    onChange(updated);
  }

  function removeSection(id: string) {
    const updated = {
      ...page,
      sections: page.sections.filter((section) => section.id !== id)
    };
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      {page.sections.map((section) => (
        <div
          key={section.id}
          className="rounded-3xl border p-4"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{section.type}</p>
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{section.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]"
                style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
              >
                Editable
              </span>
              <button
                type="button"
                onClick={() => removeSection(section.id)}
                className="rounded-full border px-3 py-1 text-[11px]"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
              >
                Remove
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {Object.keys(section.props).map((key) => (
              <label key={key} className="grid gap-2 text-sm">
                <span style={{ color: 'var(--theme-text-muted)' }}>{key}</span>
                <textarea
                  className="min-h-[44px] rounded-2xl border px-3 py-2 outline-none"
                  style={{
                    borderColor: 'var(--theme-border)',
                    background: 'var(--theme-surface-alt)',
                    color: 'var(--theme-text)'
                  }}
                  value={String(section.props[key] ?? '')}
                  onChange={(e) => updateSection(section.id, key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      {!page.sections.length ? (
        <div
          className="rounded-3xl border p-4 text-sm"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-muted)' }}
        >
          This page has no sections yet. Add one from the section library above.
        </div>
      ) : null}
    </div>
  );
}
