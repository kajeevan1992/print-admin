import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { NavItem } from './types';
import { BRAND, storeHref } from './theme-helpers';
import HeaderFulfillmentControl from './HeaderFulfillmentControl';
import AtlantisHeaderSurface from './AtlantisHeaderSurface';
import HeaderMobileButton from './HeaderMobileButton';
import SearchTrigger from './SearchTrigger';
import SearchHost from './SearchHost';
import ChromeFooter from './ChromeFooter';
import BasketHeaderSummary from './BasketHeaderSummary';
import CustomerAccountHeader from './CustomerAccountHeader';
import { loadCollectionPoints, type CollectionPoint } from './collection-points';
import { loadStorefrontRuntimeSettings, type StorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';

const MEGA_MENU_BENEFITS = ['Fast turnaround', 'Premium stock', 'Bulk pricing', 'Artwork support'];

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
  return <div style={{ backgroundColor: studio ? BRAND.primary : BRAND.black, color: 'white' }}><Shell><div className="flex h-8 items-center justify-between gap-4 text-[11px] font-medium"><span>{utilityText}</span><div className="hidden gap-5 sm:flex">{highlights.map((item) => <span key={item}>{item}</span>)}</div></div></Shell></div>;
}

function DesktopNavigation({ currentPath, navItems, storeBase, studio }: { currentPath: string; navItems: NavItem[]; storeBase: string; studio: boolean }) {
  return <nav className="hidden items-center justify-center gap-4 xl:flex">
    {navItems.map((item) => {
      const active = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
      const columns = item.columns.filter((column) => column.links.length > 0).slice(0, 4);
      const hasDropdown = columns.length > 0;
      const colour = active ? BRAND.primary : studio ? 'rgba(255,255,255,0.78)' : BRAND.ink;
      if (!hasDropdown) return <Link key={`${item.label}-${item.path}`} href={storeHref(storeBase, item.path)} className="whitespace-nowrap text-[13px] font-semibold tracking-[-0.01em] no-underline" style={{ color: colour }}>{item.label}</Link>;

      return <div key={`${item.label}-${item.path}`} className="group static">
        <Link href={storeHref(storeBase, item.path)} aria-haspopup="true" className="inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold tracking-[-0.01em] no-underline" style={{ color: colour }}>
          {item.label}<ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
        </Link>
        <div className="pointer-events-none invisible absolute inset-x-0 top-full z-50 pt-2 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
          <div className="rounded-[22px] border bg-white p-5 shadow-[0_34px_100px_rgba(0,0,0,0.13)]" style={{ borderColor: BRAND.line }}>
            <div className="grid gap-5">
              <div className="grid gap-6" style={{ gridTemplateColumns: `270px repeat(${columns.length}, minmax(0, 1fr))` }}>
                <div className="rounded-[20px] border p-4" style={{ borderColor: BRAND.line, background: 'linear-gradient(180deg, #FBFDFE 0%, #F4F9FB 100%)' }}>
                  {item.feature.image ? <img src={item.feature.image} alt={item.feature.title || item.label} className="h-36 w-full rounded-[12px] object-cover" /> : <div className="h-36 w-full rounded-[12px] bg-[#EAF6FA]" />}
                  <div className="mt-4 text-[18px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>{item.feature.title || item.label}</div>
                  <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{item.feature.body}</p>
                  <Link href={storeHref(storeBase, item.path)} className="mt-4 inline-flex text-[12px] font-bold no-underline" style={{ color: BRAND.primary }}>{item.feature.cta || `View ${item.label}`}</Link>
                </div>
                {columns.map((column) => <div key={column.title} className="min-w-0"><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>{column.title}</div><div className="grid gap-1">{column.links.slice(0, 8).map(([label, path]) => <Link key={`${label}-${path}`} href={storeHref(storeBase, path)} className="rounded-xl px-3 py-2 text-left text-[12px] font-medium no-underline hover:bg-[#F6F7F8]" style={{ color: BRAND.ink }}>{label}</Link>)}</div></div>)}
              </div>
              <div className="grid grid-cols-4 gap-3 border-t pt-4" style={{ borderColor: BRAND.line }}>
                {MEGA_MENU_BENEFITS.map((benefit) => <div key={benefit} className="rounded-[16px] border px-4 py-3 text-[11px] font-semibold" style={{ borderColor: BRAND.line, color: BRAND.muted, background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FBFC 100%)' }}>{benefit}</div>)}
              </div>
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
  const search = showSearch ? <SearchHost navItems={navItems} storeBase={storeBase} /> : null;
  return <AtlantisHeaderSurface studio={studio} search={search}>
    <div className="flex items-center gap-3"><HeaderMobileButton navItems={navItems} storeBase={storeBase} /><Link href={storeBase} className="flex items-center gap-0.5 no-underline"><StorefrontLogo settings={settings} studio={studio} /></Link></div>
    <DesktopNavigation currentPath={currentPath} navItems={navItems} storeBase={storeBase} studio={studio} />
    <div className="ml-auto flex items-center gap-2">{showFulfilment ? <HeaderFulfillmentControl tenantSlug={tenantSlug} storeSlug={storeSlug} collectionPoints={collectionPoints} /> : null}{showSearch ? <SearchTrigger /> : null}{showAccount ? <CustomerAccountHeader tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} studio={studio} /> : null}<BasketHeaderSummary tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} studio={studio} /></div>
  </AtlantisHeaderSurface>;
}

export default async function StorefrontChrome({ currentPath = '/', children, navItems, storeBase, settings: suppliedSettings }: { currentPath?: string; children: ReactNode; navItems: NavItem[]; storeBase: string; settings?: StorefrontRuntimeSettings }) {
  const { tenantSlug, storeSlug } = storeParts(storeBase);
  const settings = suppliedSettings || await loadStorefrontRuntimeSettings(tenantSlug, storeSlug);
  const collectionPoints = await loadCollectionPoints(settings.tenantIds).catch(() => []);
  const studio = settings.themeKey === 'studio-native' || settings.layout?.themeStyle === 'studio';
  const style = { '--storefront-bg': settings.brand.background, '--storefront-line': settings.brand.border, '--storefront-ink': settings.brand.text, '--storefront-muted': settings.brand.muted, '--storefront-primary': settings.brand.primary, '--storefront-primary-dark': settings.brand.primary, '--storefront-accent': settings.brand.accent, '--storefront-black': settings.content?.utilityBarColour || '#0F1012', backgroundColor: BRAND.bg, color: BRAND.ink } as CSSProperties;
  return <div style={style} data-storefront-theme={studio ? 'studio' : 'atlantis'}><UtilityBar settings={settings} studio={studio} /><Header currentPath={currentPath} navItems={navItems} storeBase={storeBase} settings={settings} collectionPoints={collectionPoints} studio={studio} />{children}{settings.layout?.showFooter !== false ? <ChromeFooter storeBase={storeBase} settings={settings} navItems={navItems} logo={<StorefrontLogo settings={settings} size="footer" studio={studio} />} studio={studio} /> : null}</div>;
}
