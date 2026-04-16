'use client';

import type { SectionType } from '@/storefront/editor/page-schema';

const sectionTypes: { type: SectionType; label: string; hint: string }[] = [
  { type: 'hero', label: 'Hero', hint: 'Top-of-page headline and intro copy.' },
  { type: 'text', label: 'Text', hint: 'Simple rich text style content block.' },
  { type: 'cta', label: 'CTA', hint: 'Call-to-action with label and description.' }
];

export function SectionLibrary({
  onAdd
}: {
  onAdd: (type: SectionType) => void;
}) {
  return (
    <div
      className="rounded-3xl border p-4"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="mb-3">
        <p className="text-sm font-semibold">Add sections</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Start building pages with reusable storefront blocks.
        </p>
      </div>

      <div className="grid gap-3">
        {sectionTypes.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onAdd(item.type)}
            className="rounded-2xl border p-3 text-left transition hover:opacity-90"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
          >
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{item.hint}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
