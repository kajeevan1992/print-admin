'use client';

export type ProductMode = 'upload-artwork' | 'customize-online' | 'use-template' | 'get-quote';

const modeLabels: Record<ProductMode, string> = {
  'upload-artwork': 'Upload artwork',
  'customize-online': 'Customize online',
  'use-template': 'Use template',
  'get-quote': 'Get quote'
};

export function ProductModeSwitch({
  value,
  onChange,
  enabledModes
}: {
  value: ProductMode;
  onChange: (mode: ProductMode) => void;
  enabledModes: ProductMode[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {enabledModes.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className="rounded-2xl border px-4 py-3 text-left text-sm transition"
          style={{
            borderColor: value === mode ? 'var(--theme-primary)' : 'var(--theme-border)',
            background: value === mode ? 'var(--theme-surface-alt)' : 'var(--theme-surface)'
          }}
        >
          <p className="font-medium">{modeLabels[mode]}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            Select this buying path for the current product.
          </p>
        </button>
      ))}
    </div>
  );
}
