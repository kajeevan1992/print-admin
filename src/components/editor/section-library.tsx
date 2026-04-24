'use client';

import { useMemo, useState } from 'react';
import { sectionPresets, type SectionPreset, type SectionType } from '@/storefront/editor/page-schema';

const filters: Array<{ label: string; value: 'all' | SectionType }> = [
  { label: 'All', value: 'all' },
  { label: 'Hero', value: 'hero' },
  { label: 'Text', value: 'text' },
  { label: 'CTA', value: 'cta' }
];

export function SectionLibrary({
  onAdd
}: {
  onAdd: (preset: SectionPreset) => void;
}) {
  const [filter, setFilter] = useState<'all' | SectionType>('all');

  const visiblePresets = useMemo(
    () => sectionPresets.filter((preset) => filter === 'all' || preset.type === filter),
    [filter]
  );

  return (
    <div
      className="rounded-3xl border p-4"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="mb-3">
        <p className="text-sm font-semibold">Section library</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Add reusable section presets instead of starting from empty blocks every time.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className="rounded-full border px-3 py-1 text-xs"
            style={{
              borderColor: filter === item.value ? 'var(--theme-primary)' : 'var(--theme-border)',
              background: filter === item.value ? 'var(--theme-surface-alt)' : 'transparent',
              color: 'var(--theme-text)'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {visiblePresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onAdd(preset)}
            className="rounded-2xl border p-3 text-left transition hover:opacity-90"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{preset.label}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{preset.hint}</p>
              </div>
              <span
                className="rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.16em]"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--theme-text-muted)' }}
              >
                {preset.type}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
