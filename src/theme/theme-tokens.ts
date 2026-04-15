export type ThemeMode = 'light' | 'dark';

export type ThemeTokens = {
  name: string;
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryText: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  typography: {
    fontSans: string;
    fontDisplay: string;
  };
};

export const baseThemeTokens: ThemeTokens = {
  name: 'Base Theme',
  mode: 'dark',
  colors: {
    background: '#0b1020',
    surface: '#11182b',
    surfaceAlt: '#162039',
    text: '#f5f7fb',
    textMuted: '#a8b3c7',
    primary: '#4f8cff',
    primaryText: '#ffffff',
    border: 'rgba(255,255,255,0.10)',
    accent: '#7dd3fc',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171'
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px'
  },
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.20)',
    md: '0 10px 30px rgba(0,0,0,0.24)',
    lg: '0 20px 60px rgba(0,0,0,0.35)'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem'
  },
  typography: {
    fontSans: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontDisplay: 'Inter, ui-sans-serif, system-ui, sans-serif'
  }
};

export const businessThemeTokens: ThemeTokens = {
  ...baseThemeTokens,
  name: 'Business Theme',
  colors: {
    ...baseThemeTokens.colors,
    primary: '#2563eb',
    accent: '#22c55e'
  }
};

export const minimalThemeTokens: ThemeTokens = {
  ...baseThemeTokens,
  name: 'Minimal Theme',
  colors: {
    ...baseThemeTokens.colors,
    surface: '#0f172a',
    surfaceAlt: '#111827',
    primary: '#38bdf8'
  }
};

export const luxuryThemeTokens: ThemeTokens = {
  ...baseThemeTokens,
  name: 'Luxury Theme',
  colors: {
    ...baseThemeTokens.colors,
    primary: '#d4af37',
    accent: '#e7c96a',
    surface: '#151515',
    surfaceAlt: '#1d1d1d'
  }
};

export const themeRegistry = {
  base: baseThemeTokens,
  business: businessThemeTokens,
  minimal: minimalThemeTokens,
  luxury: luxuryThemeTokens
} as const;

export type ThemeKey = keyof typeof themeRegistry;
