import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import type { NavItem } from './types';
import { BRAND, storeHref } from './theme-helpers';
import FulfillmentSelector from './FulfillmentSelector';
import HeaderMobileButton from './HeaderMobileButton';
import SearchTrigger from './SearchTrigger';
import SearchHost from './SearchHost';
import ChromeFooter from './ChromeFooter';
import BasketHeaderSummary from './BasketHeaderSummary';
import { loadCollectionPoints, type CollectionPoint } from './collection-points';
import { loadStorefrontRuntimeSettings, type StorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">{children}</div>;
}

function IconButton({ icon, studio }: { icon: ReactNode; studio?: boolean }) {
  return <div className="grid h-9 w-9 place-items-center rounded-xl border" style={{ borderColor: studio ? 'rgba(255,255,255,0.18)' : BRAND.line, backgroundColor: studio ? 'rgba(255,255,255,0.08)' : 'white', color: studio ? 'white' : BRAND.ink }}>{icon}</div>;
}

function storeParts(storeBase: string) {
  const parts = String(storeBase || '').split('/').filter(Boolean);
  const nativeIndex = parts.indexOf('native-stores');
  const previewIndex = parts.indexOf('theme-preview');
  const index = nativeIndex >= 0 ? nativeIndex : previewIndex;
  return {
    tenantSlug: index >= 0 ? parts[index + 1] || '' : '',
    storeSlug: index >= 0 ? parts[index + 2] || '' : '',
  };
}

function StorefrontLogo({ settings, size = 'header', studio = false }: { settings: StorefrontRuntimeSettings; size?: 'header' | 'footer'; studio?: boolean }) {
  const brandName = settings.brand.brandName || settings.storeName || 'Print Store';
  if (settings.brand.logoUrl) {
    return <img src={settings.brand.logoUrl} alt={brandName} className={size === 'footer' ? 'max-h-16 max-w-[260px] object-contain' : 'max-h-12 max-w-[220px] object-contain'} />;
  }
  if (brandName.toLowerCase() === 'holo print') {
    const className = size === 'footer' ? 'text-[50px] font-black tracking-[-0.055em]' : 'text-[42px] font-black tracking-[-0.055em]';
    return <><span className={className} style={{ color: BRAND.primary }}>HOLO</span><span className={className} style={{ color: studio ? 'white' : BRAND.ink }}>PRINT</span></>;
  }
  return <span className={size === 'footer' ? 'text-[42px] font-black tracking-[-0.05em]' : studio ? 'text-[28px] font-black uppercase tracking-[0.08em]' : 'text-[32px] font-black tracking-[-0.045em]'} style={{ color: studio ? 'white' : BRAND.ink }}>{brandName}</span>;
}

function UtilityBar({ settings, studio }: { settings: StorefrontRuntimeSettings; studio: boolean }) {
  const content = settings.content?.text || {};
  const utilityText = String(content.utilityText || settings.content?.utilityText || 'Professional print, signage and packaging solutions');
  const utilityItems = Array.isArray(settings.content?.utilityItems) && settings.content.utilityItems.length
    ? settings.content.utilityItems.slice(0, 4).map(String)
    : ['Business orders', 'Bulk pricing', 'Fast turnaround', 'Bespoke quote support'];
  return <div style={{ backgroundColor: studio ? BRAND.primary : BRAND.black, color: 'white' }}><Shell><div className="flex h-8 items-center justify-between text-[11px] font-medium"><span>{utilityText}</span><div className="hidden gap-5 sm:flex">{utilityItems.map((item) => <span key={item}>{item}</span>)}</div></div></Shell></div>;
}

function Header({ currentPath = '/', navItems, storeBase, settings, collectionPoints, studio }: { currentPath?: string; navItems: NavItem[]; storeBase: string; settings: StorefrontRuntimeSettings; collectionPoints: CollectionPoint[]; studio: boolean }) {
  const showSearch = settings.layout?.showSearch !== false;
  const showFulfilment = settings.layout?.showCollectionPoints !== false;
  const showAccount = settings.layout?.showCustomerAccount === true;
  const { tenantSlug, storeSlug } = storeParts(storeBase);
  return <header className="sticky top-0 z-40 border-b backdrop-blur transition-all duration-300" style={{ borderColor: studio ? 'rgba(255,255,255,0.12)' : BRAND.line, backgroundColor: studio ? 'rgba(17,19,21,0.96)' : 'rgba(255,255,255,0.95)' }}><Shell><div className="grid h-[74px] grid-cols-[auto_1fr_auto] items-center gap-6"><div className="flex items-center gap-3"><HeaderMobileButton navItems={navItems} storeBase={storeBase} /><Link href={storeBase} className="flex items-center gap-0.5 no-underline"><StorefrontLogo settings={settings} studio={studio} /></Link></div><nav className="hidden items-center justify-center gap-4 xl:flex">{navItems.map((item) => { const active = currentPath === item.path || currentPath.startsWith(`${item.path}/`); return <Link key={`${item.label}-${item.path}`} href={storeHref(storeBase, item.path)} className="text-[13px] font-semibold tracking-[-0.01em] no-underline" style={{ color: active ? BRAND.primary : studio ? 'rgba(255,255,255,0.78)' : BRAND.ink }}>{item.label}</Link>; })}</nav><div className="ml-auto flex items-center gap-2">{showFulfilment ? <FulfillmentSelector compact collectionPoints={collectionPoints} /> : null}{showSearch ? <SearchTrigger /> : null}{showAccount ? <Link href={`${storeBase}/login`} aria-label="Customer account"><IconButton studio={studio} icon={<User className="h-4 w-4" />} /></Link> : null}<BasketHeaderSummary tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} studio={studio} /></div></div></Shell>{showSearch ? <SearchHost navItems={navItems} storeBase={storeBase} /> : null}</header>;
}

export default async function StorefrontChrome({ currentPath = '/', children, navItems, storeBase, settings: suppliedSettings }: { currentPath?: string; children: ReactNode; navItems: NavItem[]; storeBase: string; settings?: StorefrontRuntimeSettings }) {
  const { tenantSlug, storeSlug } = storeParts(storeBase);
  const settings = suppliedSettings || await loadStorefrontRuntimeSettings(tenantSlug, storeSlug);
  const collectionPoints = await loadCollectionPoints(settings.tenantIds).catch(() => []);
  const studio = settings.themeKey === 'studio-native' || settings.layout?.themeStyle === 'studio';
  const style = {
    '--storefront-bg': settings.brand.background,
    '--storefront-line': settings.brand.border,
    '--storefront-ink': settings.brand.text,
    '--storefront-muted': settings.brand.muted,
    '--storefront-primary': settings.brand.primary,
    '--storefront-primary-dark': settings.brand.primary,
    '--storefront-accent': settings.brand.accent,
    '--storefront-black': settings.content?.utilityBarColour || '#0F1012',
    backgroundColor: BRAND.bg,
    color: BRAND.ink,
  } as CSSProperties;
  return <div style={style} data-storefront-theme={studio ? 'studio' : 'atlantis'}><UtilityBar settings={settings} studio={studio} /><Header currentPath={currentPath} navItems={navItems} storeBase={storeBase} settings={settings} collectionPoints={collectionPoints} studio={studio} />{children}<ChromeFooter storeBase={storeBase} settings={settings} navItems={navItems} logo={<StorefrontLogo settings={settings} size="footer" studio={studio} />} studio={studio} /></div>;
}
