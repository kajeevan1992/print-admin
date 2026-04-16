'use client';

import { Section } from '@/storefront/editor/page-schema';

export function SectionRenderer({ section }: { section: Section }) {
  if (section.type === 'hero') {
    return (
      <div className="rounded-3xl border p-6" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--theme-text-muted)' }}>Hero section</p>
        <h2 className="mt-3 text-2xl font-semibold">{section.props.title}</h2>
        <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{section.props.subtitle}</p>
      </div>
    );
  }

  if (section.type === 'text') {
    return (
      <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--theme-text-muted)' }}>Text section</p>
        <p className="mt-3 text-sm">{section.props.text}</p>
      </div>
    );
  }

  if (section.type === 'cta') {
    return (
      <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--theme-text-muted)' }}>CTA section</p>
        <p className="mt-3 text-sm">{section.props.description}</p>
        <button
          type="button"
          className="mt-4 rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
        >
          {section.props.label || 'Click'}
        </button>
      </div>
    );
  }

  return null;
}
