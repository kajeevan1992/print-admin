import type { CSSProperties } from 'react';
import type { StorefrontBrandSettings } from '@/theme-runtime/types';
import type { V0ThemeWidgetAppearance } from '@/v0-themes/contracts';

export type ResolvedProtectedWidgetAppearance = Required<V0ThemeWidgetAppearance>;

const DEFAULT_APPEARANCE: ResolvedProtectedWidgetAppearance = {
  surface: 'card',
  density: 'comfortable',
  radius: 'medium',
  optionStyle: 'auto',
  fieldStyle: 'outline',
  buttonStyle: 'pill',
  priceStyle: 'panel',
  shadow: 'soft',
  labelStyle: 'uppercase',
};

const choices = {
  surface: new Set(['card', 'soft', 'flat']),
  density: new Set(['compact', 'comfortable', 'spacious']),
  radius: new Set(['small', 'medium', 'large']),
  optionStyle: new Set(['auto', 'cards', 'pills', 'segments']),
  fieldStyle: new Set(['outline', 'filled', 'underline']),
  buttonStyle: new Set(['pill', 'rounded', 'square']),
  priceStyle: new Set(['panel', 'highlight', 'minimal']),
  shadow: new Set(['none', 'soft', 'strong']),
  labelStyle: new Set(['normal', 'uppercase']),
} as const;

function pick<K extends keyof ResolvedProtectedWidgetAppearance>(key: K, value: unknown): ResolvedProtectedWidgetAppearance[K] {
  const clean = String(value || '').trim();
  return (choices[key] as Set<string>).has(clean) ? clean as ResolvedProtectedWidgetAppearance[K] : DEFAULT_APPEARANCE[key];
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function alphaColour(value: string, alphaHex: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? `${value}${alphaHex}` : fallback;
}

export function resolveProtectedWidgetAppearance(value: unknown): ResolvedProtectedWidgetAppearance {
  const input = object(value);
  return {
    surface: pick('surface', input.surface),
    density: pick('density', input.density),
    radius: pick('radius', input.radius),
    optionStyle: pick('optionStyle', input.optionStyle),
    fieldStyle: pick('fieldStyle', input.fieldStyle),
    buttonStyle: pick('buttonStyle', input.buttonStyle),
    priceStyle: pick('priceStyle', input.priceStyle),
    shadow: pick('shadow', input.shadow),
    labelStyle: pick('labelStyle', input.labelStyle),
  };
}

export function mergeProtectedWidgetAppearance(base: unknown, override: unknown): ResolvedProtectedWidgetAppearance {
  return resolveProtectedWidgetAppearance({ ...object(base), ...object(override) });
}

export function protectedWidgetAppearanceFromSettings(settings?: { layout?: Record<string, any> } | null) {
  return resolveProtectedWidgetAppearance(settings?.layout?.widgetAppearance);
}

export function protectedWidgetTheme(value: unknown, brand?: Partial<StorefrontBrandSettings> | null) {
  const appearance = resolveProtectedWidgetAppearance(value);
  const primary = String(brand?.primary || '#18A7D0');
  const accent = String(brand?.accent || '#7B3FE4');
  const text = String(brand?.text || '#161A22');
  const muted = String(brand?.muted || '#667487');
  const border = String(brand?.border || '#E3E8F0');
  const background = String(brand?.background || '#F7F8FC');
  const active = alphaColour(primary, '14', 'rgba(24,167,208,0.08)');
  const soft = alphaColour(primary, '0D', '#F5FAFC');

  const radius = appearance.radius === 'small'
    ? { surface: 'rounded-xl', section: 'rounded-lg', control: 'rounded-md' }
    : appearance.radius === 'large'
      ? { surface: 'rounded-[32px]', section: 'rounded-[24px]', control: 'rounded-[20px]' }
      : { surface: 'rounded-[26px]', section: 'rounded-[18px]', control: 'rounded-[14px]' };
  const density = appearance.density === 'compact'
    ? { surface: 'p-4', section: 'p-3', control: 'px-3 py-2', gap: 'gap-3', top: 'mt-4' }
    : appearance.density === 'spacious'
      ? { surface: 'p-8', section: 'p-5', control: 'px-5 py-4', gap: 'gap-5', top: 'mt-6' }
      : { surface: 'p-6', section: 'p-4', control: 'px-4 py-3', gap: 'gap-4', top: 'mt-5' };
  const shadow = appearance.shadow === 'strong'
    ? 'shadow-[0_28px_80px_rgba(15,23,42,0.16)]'
    : appearance.shadow === 'soft'
      ? 'shadow-[0_18px_48px_rgba(15,23,42,0.08)]'
      : '';
  const surface = appearance.surface === 'flat'
    ? 'border-0 bg-transparent p-0 shadow-none'
    : appearance.surface === 'soft'
      ? `border ${radius.surface} ${density.surface} ${shadow}`
      : `border bg-white ${radius.surface} ${density.surface} ${shadow}`;
  const optionCard = `${radius.control} border ${density.control} text-left text-[12px] font-black`;
  const optionPill = `rounded-full border ${density.control} text-center text-[12px] font-black`;
  const optionSegment = `${radius.control} border ${density.control} text-center text-[12px] font-black`;
  const option = appearance.optionStyle === 'pills'
    ? optionPill
    : appearance.optionStyle === 'segments'
      ? optionSegment
      : optionCard;
  const field = appearance.fieldStyle === 'filled'
    ? `${radius.control} border border-transparent px-4 py-3 text-sm outline-none`
    : appearance.fieldStyle === 'underline'
      ? 'rounded-none border-0 border-b bg-transparent px-0 py-3 text-sm outline-none'
      : `${radius.control} border bg-white px-4 py-3 text-sm outline-none`;
  const buttonRadius = appearance.buttonStyle === 'pill' ? 'rounded-full' : appearance.buttonStyle === 'square' ? 'rounded-md' : radius.control;
  const button = `${buttonRadius} px-5 py-3 text-[12px] font-black`;
  const price = appearance.priceStyle === 'minimal'
    ? 'border-0 bg-transparent p-0'
    : appearance.priceStyle === 'highlight'
      ? `${radius.section} border ${density.section}`
      : `${radius.section} border bg-white ${density.section}`;
  const label = appearance.labelStyle === 'uppercase'
    ? 'text-[11px] font-black uppercase tracking-[0.14em]'
    : 'text-[12px] font-black';

  const rootStyle = {
    '--widget-primary': primary,
    '--widget-accent': accent,
    '--widget-text': text,
    '--widget-muted': muted,
    '--widget-border': border,
    '--widget-background': background,
    '--widget-active': active,
    '--widget-soft': soft,
  } as CSSProperties;

  return {
    appearance,
    rootStyle,
    classes: {
      surface,
      section: `${radius.section} border ${density.section}`,
      option,
      optionCard,
      optionPill,
      optionSegment,
      field,
      button,
      price,
      label,
      gap: density.gap,
      top: density.top,
      controlRadius: radius.control,
    },
    styles: {
      surface: { borderColor: border, backgroundColor: appearance.surface === 'soft' ? soft : appearance.surface === 'flat' ? 'transparent' : 'white' } as CSSProperties,
      section: { borderColor: border, backgroundColor: appearance.surface === 'soft' ? soft : 'white' } as CSSProperties,
      inactiveControl: { borderColor: border, color: text, backgroundColor: appearance.fieldStyle === 'filled' ? soft : 'white' } as CSSProperties,
      activeControl: { borderColor: primary, color: primary, backgroundColor: active } as CSSProperties,
      field: { borderColor: appearance.fieldStyle === 'underline' ? border : appearance.fieldStyle === 'filled' ? 'transparent' : border, color: text, backgroundColor: appearance.fieldStyle === 'filled' ? soft : appearance.fieldStyle === 'underline' ? 'transparent' : 'white' } as CSSProperties,
      price: { borderColor: appearance.priceStyle === 'highlight' ? primary : border, backgroundColor: appearance.priceStyle === 'highlight' ? active : appearance.priceStyle === 'minimal' ? 'transparent' : 'white' } as CSSProperties,
      primaryButton: { backgroundColor: primary, color: 'white' } as CSSProperties,
      secondaryButton: { borderColor: border, color: text, backgroundColor: 'white' } as CSSProperties,
      text: { color: text } as CSSProperties,
      muted: { color: muted } as CSSProperties,
      primaryText: { color: primary } as CSSProperties,
    },
  };
}
