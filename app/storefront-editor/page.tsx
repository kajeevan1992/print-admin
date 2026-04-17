'use client';

import { useState } from 'react';
import { demoPage, type SectionPreset } from '@/storefront/editor/page-schema';
import { SectionRenderer } from '@/components/editor/section-renderer';
import { VisualEditorPanel } from '@/components/editor/visual-editor-panel';
import { SectionLibrary } from '@/components/editor/section-library';

export default function StorefrontEditorPage() {
  const [page, setPage] = useState(demoPage);

  function addSection(preset: SectionPreset) {
    const nextSection = preset.create();
    setPage((current) => ({
      ...current,
      sections: [...current.sections, nextSection]
    }));
  }

  return (
    <div className="grid gap-6 p-6 xl:grid-cols-[440px_1fr]">
      <div>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--theme-text-muted)' }}>
            Visual editor
          </p>
          <h1 className="mt-2 text-2xl font-semibold">{page.name}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Add, remove, edit, reorder, and now choose from reusable section presets while keeping the page JSON schema clean.
          </p>
        </div>

        <div className="space-y-4">
          <SectionLibrary onAdd={addSection} />
          <VisualEditorPanel page={page} onChange={setPage} />
        </div>
      </div>

      <div>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--theme-text-muted)' }}>
            Live preview
          </p>
          <h2 className="mt-2 text-xl font-semibold">Storefront preview</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Section presets let users build pages faster while still keeping output structured and themeable.
          </p>
        </div>

        <div className="space-y-4 rounded-[2rem] border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-bg)' }}>
          {page.sections.map((section) => (
            <SectionRenderer key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
