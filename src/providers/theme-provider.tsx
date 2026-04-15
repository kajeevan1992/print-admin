'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultTenantThemeConfig, resolveTenantTheme, type TenantThemeConfig } from '@/theme/theme-config';
import type { ThemeTokens } from '@/theme/theme-tokens';

type ThemeContextValue = {
  config: TenantThemeConfig;
  tokens: ThemeTokens;
  setTenantThemeConfig: (next: Partial<TenantThemeConfig>) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTokensToDom(tokens: ThemeTokens, customCss?: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--theme-bg', tokens.colors.background);
  root.style.setProperty('--theme-surface', tokens.colors.surface);
  root.style.setProperty('--theme-surface-alt', tokens.colors.surfaceAlt);
  root.style.setProperty('--theme-text', tokens.colors.text);
  root.style.setProperty('--theme-text-muted', tokens.colors.textMuted);
  root.style.setProperty('--theme-primary', tokens.colors.primary);
  root.style.setProperty('--theme-primary-text', tokens.colors.primaryText);
  root.style.setProperty('--theme-border', tokens.colors.border);
  root.style.setProperty('--theme-accent', tokens.colors.accent);
  root.style.setProperty('--theme-success', tokens.colors.success);
  root.style.setProperty('--theme-warning', tokens.colors.warning);
  root.style.setProperty('--theme-danger', tokens.colors.danger);
  root.style.setProperty('--theme-radius-sm', tokens.radius.sm);
  root.style.setProperty('--theme-radius-md', tokens.radius.md);
  root.style.setProperty('--theme-radius-lg', tokens.radius.lg);
  root.style.setProperty('--theme-radius-xl', tokens.radius.xl);
  root.style.setProperty('--theme-radius-full', tokens.radius.full);
  root.style.setProperty('--theme-shadow-sm', tokens.shadow.sm);
  root.style.setProperty('--theme-shadow-md', tokens.shadow.md);
  root.style.setProperty('--theme-shadow-lg', tokens.shadow.lg);
  root.style.setProperty('--theme-font-sans', tokens.typography.fontSans);
  root.style.setProperty('--theme-font-display', tokens.typography.fontDisplay);

  const styleId = 'tenant-theme-custom-css';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = customCss ?? '';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantThemeConfig>(defaultTenantThemeConfig);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('print-admin.tenant-theme-config');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TenantThemeConfig>;
        setConfig((current) => ({ ...current, ...parsed, pageVariants: { ...current.pageVariants, ...(parsed.pageVariants ?? {}) } }));
      }
    } catch {}
  }, []);

  const resolved = useMemo(() => resolveTenantTheme(config), [config]);

  useEffect(() => {
    applyTokensToDom(resolved.tokens, resolved.config.customCss);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('print-admin.tenant-theme-config', JSON.stringify(resolved.config));
    }
  }, [resolved]);

  const value = useMemo<ThemeContextValue>(() => ({
    config: resolved.config,
    tokens: resolved.tokens,
    setTenantThemeConfig: (next) => {
      setConfig((current) => ({
        ...current,
        ...next,
        pageVariants: {
          ...current.pageVariants,
          ...(next.pageVariants ?? {})
        }
      }));
    }
  }), [resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTenantTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTenantTheme must be used inside ThemeProvider');
  }
  return context;
}
