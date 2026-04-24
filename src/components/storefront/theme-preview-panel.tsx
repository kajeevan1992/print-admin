'use client';

import { useTenantTheme } from '@/providers/theme-provider';
import type { ThemeKey } from '@/theme/theme-tokens';

const themeOptions: ThemeKey[] = ['base', 'business', 'minimal', 'luxury'];

export function ThemePreviewPanel() {
  const { config, tokens, setTenantThemeConfig } = useTenantTheme();

  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Theme engine preview</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Switch theme presets now. Client overrides can layer on top later.
          </p>
        </div>
        <div className="rounded-full px-3 py-1 text-xs" style={{ background: 'var(--theme-surface-alt)' }}>
          {config.themeKey}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {themeOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTenantThemeConfig({ themeKey: option })}
            className="rounded-2xl border p-4 text-left transition hover:opacity-90"
            style={{
              borderColor: config.themeKey === option ? 'var(--theme-primary)' : 'var(--theme-border)',
              background: 'var(--theme-surface-alt)'
            }}
          >
            <p className="text-sm font-medium capitalize">{option}</p>
            <p className="mt-2 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              Preset for reusable white-label storefront styling.
            </p>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {[
          ['Background', tokens.colors.background],
          ['Surface', tokens.colors.surface],
          ['Primary', tokens.colors.primary],
          ['Accent', tokens.colors.accent],
          ['Text', tokens.colors.text]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border p-3" style={{ borderColor: 'var(--theme-border)' }}>
            <div className="mb-2 h-8 rounded-xl" style={{ background: value }} />
            <p className="text-xs font-medium">{label}</p>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
