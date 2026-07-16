import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { ShoppingCart, User } from 'lucide-react';
import type { NavItem } from './types';
import { BRAND, storeHref } from './theme-helpers';
import FulfillmentSelector from './FulfillmentSelector';
import HeaderMobileButton from './HeaderMobileButton';
import SearchTrigger from './SearchTrigger';
import SearchHost from './SearchHost';
import ChromeFooter from './ChromeFooter';
import { loadCollectionPoints, type CollectionPoint } from './collection-points';
import { loadStorefrontRuntimeSettings, type StorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">{children}</div>;
}

function IconButton({ icon }: { icon: ReactNode }) {
  return <div className="grid h-9 w-9 place-items-center rounded-xl border bg-white" style={{ borderColor: BRAND.line }}>{icon}</div>;
}

function storeParts(storeBase: string) {
  const parts = String(storeBase || '').split('/').filter(Boolean);
  const nativeIndex = parts.indexOf('native-stores');
  return {
    tenantSlug: nativeIndex >= 0 ? parts[nativeIndex + 1] || '' : '',
    storeSlug: nativeIndex >= 0 ? parts[nativeIndex + 2] || '' : '',
  };
}

function StorefrontLogo({ settings, size = 'header' }: { settings: StorefrontRuntimeSettings; size?: 'header' | 'footer' }) {
  const brandName = settings.brand.brandName || settings.storeName || 'Print Store';
  if (settings.brand.logoUrl) {
    return <img src={settings.brand.logoUrl} alt={brandName} className={size === 'footer' ? 'max-h-16 max-w-[260px] object-contain' : 'max-h-12 max-w-[220px] object-contain'} />;
  }
  if (brandName.toLowerCase() === 'holo print') {
    const className = size === 'footer' ? 'text-[50px] font-black tracking-[-0.055em]' : 'text-[42px] font-black tracking-[-0.055em]';
    return <><span className={className} style={{ color: BRAND.primary }}>HOLO</span><span className={className} style={{ color: BRAND.ink }}>PRINT</span></>;
  }
  return <span className={size === 'footer' ? 'text-[42px] font-black tracking-[-0.05em]' : 'text-[32px] font-black tracking-[-0.045em]'} style={{ color: BRAND.ink }}>{brandName}</span>;
}

function UtilityBar({ settings }: { settings: StorefrontRuntimeSettings }) {
  const text = settings.content?.text || {};
  const utilityText = String(text.utilityText || settings.content?.utilityText || 'Professional print, signage and packaging solutions');
  const utilityItems = Array.isArray(settings.content?.utilityItems) && settings.content.utilityItems.length
    ? settings.content.utilityItems.slice(0, 4).map(String)
    : ['Business orders', 'Bulk pricing', 'Fast turnaround', 'Bespoke quote support'];
  return <div style={{ backgroundColor: BRAND.black, color: 'white' }}><Shell><div className="flex h-8 items-center justify-between text-[11px] font-medium"><span>{utilityText}</span><div className="hidden gap-5 sm:flex">{utilityItems.map((item) => <span key={item}>{item}</span>)}</div></div></Shell></div>;
}

function Header({ currentPath = '/', navItems, storeBase, settings, collectionPoints }: { currentPath?: string; navItems: NavItem[]; storeBase: string; settings: StorefrontRuntimeSettings; collectionPoints: CollectionPoint[] }) {
  const showSearch = settings.layout?.showSearch !== false;
  const showFulfilment = settings.layout?.showCollectionPoints !== false;
  const showAccount = settings.layout?.showCustomerAccount === true;
  return <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-all duration-300" style={{ borderColor: BRAND.line }}><Shell><div className="grid h-[74px] grid-cols-[auto_1fr_auto] items-center gap-6"><div className="flex items-center gap-3"><HeaderMobileButton navItems={navItems} storeBase={storeBase} /><Link href={storeBase} className="flex items-center gap-0.5 no-underline"><StorefrontLogo settings={settings} /></Link></div><nav className="hidden items-center justify-center gap-4 xl:flex">{navItems.map((item) => { const active = currentPath === item.path || currentPath.startsWith(`${item.path}/`); return <Link key={`${item.label}-${item.path}`} href={storeHref(storeBase, item.path)} className="text-[13px] font-semibold tracking-[-0.01em] no-underline" style={{ color: active ? BRAND.primary : BRAND.ink }}>{item.label}</Link>; })}</nav><div className="ml-auto flex items-center gap-2">{showFulfilment ? <FulfillmentSelector compact collectionPoints={collectionPoints} /> : null}{showSearch ? <SearchTrigger /> : null}{showAccount ? <Link href={`${storeBase}/login`} aria-label="Customer account"><IconButton icon={<User className="h-4 w-4" />} /></Link> : null}<Link href={`${storeBase}/cart`} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold no-underline" style={{ borderColor: BRAND.line, color: BRAND.muted, backgroundColor: 'white' }}><ShoppingCart className="h-4 w-4" /><span>Basket</span></Link></div></div></Shell>{showSearch ? <SearchHost navItems={navItems} storeBase={storeBase} /> : null}</header>;
}

export default async function StorefrontChrome({ currentPath = '/', children, navItems, storeBase, settings: suppliedSettings }: { currentPath?: string; children: ReactNode; navItems: NavItem[]; storeBase: string; settings?: StorefrontRuntimeSettings }) {
  const { tenantSlug, storeSlug } = storeParts(storeBase);
  const settings = suppliedSettings || await loadStorefrontRuntimeSettings(tenantSlug, storeSlug);
  const collectionPoints = await loadCollectionPoints(settings.tenantIds).catch(() => []);
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
  return <div style={style}><UtilityBar settings={settings} /><Header currentPath={currentPath} navItems={navItems} storeBase={storeBase} settings={settings} collectionPoints={collectionPoints} />{children}<ChromeFooter storeBase={storeBase} settings={settings} navItems={navItems} logo={<StorefrontLogo settings={settings} size="footer" />} /></div>;
}
