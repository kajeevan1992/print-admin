import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { NavItem } from './types';
import { BRAND, storeHref } from './theme-helpers';
import FulfillmentSelector from './FulfillmentSelector';
import HeaderMobileButton from './HeaderMobileButton';
import SearchTrigger from './SearchTrigger';
import SearchHost from './SearchHost';
import ChromeFooter from './ChromeFooter';
import BasketHeaderSummary from './BasketHeaderSummary';
import CustomerAccountHeader from './CustomerAccountHeader';
import { loadCollectionPoints, type CollectionPoint } from './collection-points';
import { loadStorefrontRuntimeSettings, type StorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">{children}</div>;
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
  if (settings.brand.logoUrl) return <img src={settings.brand.logoUrl} alt={brandName} className={size === 'footer' ? 'max-h-16 max-w-[260px] object-contain' : 'max-h-12 max-w-[220px] object-contain'} />;
  if (brandName.toLowerCase() === 'holo print') {
    const className = size === 'footer' ? 'text-[50px] font-black tracking-[-0.055em]' : 'text-[42px] font-black tracking-[-0.055em]';
    return <><span className={className} style={{ color: BRAND.primary }}>HOLO</span><span className={className} style={{ color: studio ? 'white' : BRAND.ink }}>PRINT</span></>;
  }
  return <span className={size === 'footer' ? 'text-[42px] font-black tracking-[-0.05em]' : studio ? 'text-[28px] font-black uppercase tracking-[0.08em]' : 'text-[32px] font-black tracking-[-0.045em]'} style={{ color: studio ? 'white' : BRAND.ink }}>{brandName}</span>;
}

function utilityItems(value: unknown) {
  const items = Array.isArray(value)
    ? value.map(String)
    : String(value || '').split(/\r?\n|,/g);
  return items.map((item) => item.trim()).filter(Boolean).slice(0, 4);
}

function UtilityBar({ settings, studio }: { settings: StorefrontRuntimeSettings; studio: boolean }) {
  if (settings.layout?.showUtilityBar === false) return null;
  const content = settings.content?.text || {};
  const utilityText = String(content.utilityText || settings.content?.utilityText || 'Professional print, signage and packaging solutions');
  const configuredItems = utilityItems(settings.content?.utilityItems);
  const highlights = configuredItems.length ? configuredItems : ['Business orders', 'Bulk pricing', 'Fast turnaround', 'Bespoke quote support'];
  return <div style={{ backgroundColor: studio ? BRAND.primary : BRAND.black, color: 'white' }}><Shell><div className="flex min-h-8 items-center justify-between gap-4 py-1.5 text-[11px] font-medium"><span>{utilityText}</span><div className="hidden gap-5 sm:flex">{highlights.map((item) => <span key={item}>{item}</span>)}</div></div></Shell></div>;
}

function DesktopNavigation({ currentPath, navItems, storeBase, studio }: { currentPath: string; navItems: NavItem[]; storeBase: string; studio: boolean }) {
  return <nav className="hidden items-center justify-center gap-4 xl:flex">
    {navItems.map((item) => {
      const active = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
      const hasDropdown = item.columns.some((column) => column.links.length > 0);
      const colour = active ? BRAND.primary : studio ? 'rgba(255,255,255,0.78)' : BRAND.ink;
      if (!hasDropdown) return <Link key={`${item.label}-${item.path}`} href={storeHref(storeBase, item.path)} className="text-[13px] font-semibold tracking-[-0.01em] no-underline" style={{ color: colour }}>{item.label}</Link>;

      return <div key={`${item.label}-${item.path}`} className="group relative">
        <Link href={storeHref(storeBase, item.path)} aria-haspopup="true" className="inline-flex items-center gap-1 text-[13px] font-semibold tracking-[-0.01em] no-underline" style={{ color: colour }}>
          {item.label}<ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
        </Link>
        <div className="pointer-events-none invisible absolute left-1/2 top-full z-50 w-[min(820px,calc(100vw-3rem))] -translate-x-1/2 pt-4 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
          <div className="grid grid-cols-[220px_1fr] gap-6 rounded-[22px] border bg-white p-5 shadow-2xl" style={{ borderColor: BRAND.line }}>
            <div className="overflow-hidden rounded-2xl bg-[#F6F7F8]">
              {item.feature.image ? <img src={item.feature.image} alt="" className="h-28 w-full object-cover" /> : null}
              <div className="p-4"><div className="text-[15px] font-black" style={{ color: BRAND.ink }}>{item.feature.title || item.label}</div><p className="mt-2 text-[11px] leading-5" style={{ color: BRAND.muted }}>{item.feature.body}</p><Link href={storeHref(storeBase, item.path)} className="mt-3 inline-flex text-[11px] font-black no-underline" style={{ color: BRAND.primary }}>{item.feature.cta || `View ${item.label}`}</Link></div>
            </div>
            <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(item.columns.length, 1), 4)}, minmax(0, 1fr))` }}>
              {item.columns.slice(0, 4).map((column) => <div key={column.title}><div className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>{column.title}</div><div className="mt-3 grid gap-2">{column.links.slice(0, 8).map(([label, path]) => <Link key={`${label}-${path}`} href={storeHref(storeBase, path)} className="text-[12px] font-semibold no-underline hover:underline" style={{ color: BRAND.ink }}>{label}</Link>)}</div></div>)}
            </div>
          </div>
        </div>
      </div>;
    })}
  </nav>;
}

function Header({ currentPath = '/', navItems, storeBase, settings, collectionPoints, studio }: { currentPath?: string; navItems: NavItem[]; storeBase: string; settings: StorefrontRuntimeSettings; collectionPoints: CollectionPoint[]; studio: boolean }) {
  const showSearch = settings.layout?.showSearch !== false;
  const showFulfilment = settings.layout?.showCollectionPoints !== false;
  const showAccount = settings.layout?.showCustomerAccount !== false;
  const { tenantSlug, storeSlug } = storeParts(storeBase);
  return <header className="sticky top-0 z-40 border-b backdrop-blur transition-all duration-300" style={{ borderColor: studio ? 'rgba(255,255,255,0.12)' : BRAND.line, backgroundColor: studio ? 'rgba(17,19,21,0.96)' : 'rgba(255,255,255,0.95)' }}><Shell><div className="grid h-[74px] grid-cols-[auto_1fr_auto] items-center gap-6"><div className="flex items-center gap-3"><HeaderMobileButton navItems={navItems} storeBase={storeBase} /><Link href={storeBase} className="flex items-center gap-0.5 no-underline"><StorefrontLogo settings={settings} studio={studio} /></Link></div><DesktopNavigation currentPath={currentPath} navItems={navItems} storeBase={storeBase} studio={studio} /><div className="ml-auto flex items-center gap-2">{showFulfilment ? <FulfillmentSelector compact tenantSlug={tenantSlug} storeSlug={storeSlug} collectionPoints={collectionPoints} /> : null}{showSearch ? <SearchTrigger /> : null}{showAccount ? <CustomerAccountHeader tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} studio={studio} /> : null}<BasketHeaderSummary tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} studio={studio} /></div></div></Shell>{showSearch ? <SearchHost navItems={navItems} storeBase={storeBase} /> : null}</header>;
}

export default async function StorefrontChrome({ currentPath = '/', children, navItems, storeBase, settings: suppliedSettings }: { currentPath?: string; children: ReactNode; navItems: NavItem[]; storeBase: string; settings?: StorefrontRuntimeSettings }) {
  const { tenantSlug, storeSlug } = storeParts(storeBase);
  const settings = suppliedSettings || await loadStorefrontRuntimeSettings(tenantSlug, storeSlug);
  const collectionPoints = await loadCollectionPoints(settings.tenantIds).catch(() => []);
  const studio = settings.themeKey === 'studio-native' || settings.layout?.themeStyle === 'studio';
  const style = { '--storefront-bg': settings.brand.background, '--storefront-line': settings.brand.border, '--storefront-ink': settings.brand.text, '--storefront-muted': settings.brand.muted, '--storefront-primary': settings.brand.primary, '--storefront-primary-dark': settings.brand.primary, '--storefront-accent': settings.brand.accent, '--storefront-black': settings.content?.utilityBarColour || '#0F1012', backgroundColor: BRAND.bg, color: BRAND.ink } as CSSProperties;
  return <div style={style} data-storefront-theme={studio ? 'studio' : 'atlantis'}><UtilityBar settings={settings} studio={studio} /><Header currentPath={currentPath} navItems={navItems} storeBase={storeBase} settings={settings} collectionPoints={collectionPoints} studio={studio} />{children}{settings.layout?.showFooter !== false ? <ChromeFooter storeBase={storeBase} settings={settings} navItems={navItems} logo={<StorefrontLogo settings={settings} size="footer" studio={studio} />} studio={studio} /> : null}</div>;
}
