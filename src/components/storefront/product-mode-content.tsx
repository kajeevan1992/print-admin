import type { ProductMode } from './product-mode-switch';

const contentMap: Record<ProductMode, { title: string; body: string; cta: string }> = {
  'upload-artwork': {
    title: 'Upload your finished artwork',
    body: 'Best for customers with final print-ready files who want a fast route to production.',
    cta: 'Upload files'
  },
  'customize-online': {
    title: 'Customize online',
    body: 'Best for standardized branded products, fast personalization, and guided editing.',
    cta: 'Start customizing'
  },
  'use-template': {
    title: 'Use a template',
    body: 'Best for controlled layouts, approved brand assets, and repeatable offline or online templates.',
    cta: 'Browse templates'
  },
  'get-quote': {
    title: 'Request a quote',
    body: 'Best for advanced packaging, special finishes, or products with custom specifications.',
    cta: 'Request quote'
  }
};

export function ProductModeContent({ mode }: { mode: ProductMode }) {
  const content = contentMap[mode];

  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">{content.title}</p>
      <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{content.body}</p>
      <button
        type="button"
        className="mt-5 rounded-full px-4 py-3 text-sm font-medium"
        style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
      >
        {content.cta}
      </button>
    </div>
  );
}
