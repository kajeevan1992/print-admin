import { themeRegistry, type ThemeKey, type ThemeTokens } from './theme-tokens';

export type TenantThemeConfig = {
  tenantId: string;
  tenantName: string;
  themeKey: ThemeKey;
  overrides?: Partial<ThemeTokens>;
  customCss?: string;
  pageVariants?: {
    storefrontHome?: string;
    categoryListing?: string;
    productDetail?: string;
    accountDashboard?: string;
  };
};

export const defaultTenantThemeConfig: TenantThemeConfig = {
  tenantId: 'default',
  tenantName: 'Print Admin',
  themeKey: 'base',
  pageVariants: {
    storefrontHome: 'default',
    categoryListing: 'grid',
    productDetail: 'commerce',
    accountDashboard: 'default'
  }
};

export function resolveTenantTheme(config?: Partial<TenantThemeConfig>) {
  const merged: TenantThemeConfig = {
    ...defaultTenantThemeConfig,
    ...config,
    pageVariants: {
      ...defaultTenantThemeConfig.pageVariants,
      ...(config?.pageVariants ?? {})
    }
  };
  const base = themeRegistry[merged.themeKey];
  return {
    config: merged,
    tokens: {
      ...base,
      ...(merged.overrides ?? {}),
      colors: {
        ...base.colors,
        ...(merged.overrides?.colors ?? {})
      },
      radius: {
        ...base.radius,
        ...(merged.overrides?.radius ?? {})
      },
      shadow: {
        ...base.shadow,
        ...(merged.overrides?.shadow ?? {})
      },
      spacing: {
        ...base.spacing,
        ...(merged.overrides?.spacing ?? {})
      },
      typography: {
        ...base.typography,
        ...(merged.overrides?.typography ?? {})
      }
    }
  };
}
