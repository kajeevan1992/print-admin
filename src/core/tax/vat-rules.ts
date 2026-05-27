import { getGlobalVatSettingsSync, termsList } from './global-vat-settings';

export type VatProfile = {
  vatRate: number;
  vatClass: 'zero' | 'standard' | 'exempt' | 'custom';
  vatReason: string;
};

export type VatLineCalculation = VatProfile & {
  quantity: number;
  grossMinor: number;
  netMinor: number;
  vatMinor: number;
  unitGrossMinor: number;
  unitNetMinor: number;
};

type ProductTaxSettingsLike = { taxClass?: 'auto' | 'zero' | 'standard' | 'exempt' | 'custom' | string; vatRate?: number | string; vatLabel?: string; preset?: string; appliesToAddons?: boolean; forceVatOnDesignServices?: boolean };

function numberOrNull(value: unknown) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? next : null; }
function minor(value: unknown) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : 0; }
function moneyToMinor(value: unknown) { const next = Number(value); if (!Number.isFinite(next) || next < 0) return 0; return next > 10000 ? Math.round(next) : Math.round(next * 100); }
function text(value: unknown) { return String(value || '').toLowerCase().replace(/[_-]+/g, ' '); }
function combinedText(item: Record<string, any>) { const meta = item.metadataJson || item.metadata || {}; const config = item.config || item.selections || item.options || {}; const resolver = item.resolverSnapshot || {}; return [item.name, item.title, item.productName, item.titleSnapshot, item.productId, item.slug, item.sku, item.categoryName, item.categorySlug, item.productCategory, item.taxClass, item.vatClass, meta.name, meta.title, meta.productName, meta.categoryName, meta.categorySlug, meta.taxClass, meta.vatClass, config.name, config.title, config.productName, config.categoryName, config.categorySlug, config.taxClass, config.vatClass, resolver.product?.name, resolver.product?.title, resolver.product?.categoryName, resolver.product?.categorySlug].map(text).filter(Boolean).join(' '); }
function taxSettingsFrom(item: Record<string, any>): ProductTaxSettingsLike | null { const meta = item.metadataJson || item.metadata || {}; const config = item.config || item.selections || item.options || {}; const resolver = item.resolverSnapshot || {}; return item.taxSettings || meta.taxSettings || config.taxSettings || resolver.product?.taxSettings || resolver.taxSettings || null; }
function readExplicitRate(item: Record<string, any>) { const meta = item.metadataJson || item.metadata || {}; const config = item.config || item.selections || item.options || {}; const resolver = item.resolverSnapshot || {}; const taxSettings = taxSettingsFrom(item); const candidates = [item.vatRate, item.taxRate, item.vat_rate, item.tax_rate, meta.vatRate, meta.taxRate, meta.vat_rate, meta.tax_rate, config.vatRate, config.taxRate, config.vat_rate, config.tax_rate, taxSettings?.taxClass === 'custom' ? taxSettings?.vatRate : undefined, resolver.vatRate, resolver.taxRate, resolver.product?.vatRate, resolver.product?.taxRate, resolver.pricing?.vatRate, resolver.pricing?.selected?.vatRate]; for (const candidate of candidates) { const rate = numberOrNull(candidate); if (rate !== null) return rate; } return null; }
function readTaxClass(item: Record<string, any>) { const meta = item.metadataJson || item.metadata || {}; const config = item.config || item.selections || item.options || {}; const resolver = item.resolverSnapshot || {}; const taxSettings = taxSettingsFrom(item); return text(item.vatClass || item.taxClass || meta.vatClass || meta.taxClass || config.vatClass || config.taxClass || taxSettings?.taxClass || resolver.product?.vatClass || resolver.product?.taxClass || resolver.pricing?.taxClass || ''); }
function hasAny(source: string, words: string[]) { return words.some((word) => source.includes(word)); }
function classFromRate(rate: number): VatProfile['vatClass'] { return rate === 0 ? 'zero' : rate === 20 ? 'standard' : 'custom'; }
function classToRate(vatClass: string, standardRate: number, fallbackRate: number) { if (vatClass === 'zero' || vatClass === 'exempt') return 0; if (vatClass === 'standard') return standardRate; return fallbackRate; }

function profileFromTaxSettings(settings: ProductTaxSettingsLike | null, sourceText: string): VatProfile | null {
  const global = getGlobalVatSettingsSync();
  if (!global.enabled) return { vatRate: 0, vatClass: 'zero', vatReason: 'global-vat-engine-disabled' };
  if (!settings) return null;
  const preset = text(settings.preset || '');
  const taxClass = text(settings.taxClass || 'auto');
  const serviceTerms = termsList(global.standardRatedServiceTerms);
  const forceServiceVat = settings.forceVatOnDesignServices !== false && global.forceDesignServicesStandardVat;
  if (forceServiceVat && hasAny(sourceText, serviceTerms)) return { vatRate: global.designServiceVatRate, vatClass: classFromRate(global.designServiceVatRate), vatReason: 'product-tax-settings-design-service-override' };
  if (taxClass === 'standard') return { vatRate: global.standardVatRate, vatClass: 'standard', vatReason: 'product-tax-settings-standard' };
  if (taxClass === 'zero') return { vatRate: 0, vatClass: 'zero', vatReason: 'product-tax-settings-zero' };
  if (taxClass === 'exempt') return { vatRate: 0, vatClass: 'exempt', vatReason: 'product-tax-settings-exempt' };
  if (taxClass === 'custom') { const rate = numberOrNull(settings.vatRate) ?? global.defaultFallbackVatRate; return { vatRate: rate, vatClass: classFromRate(rate), vatReason: 'product-tax-settings-custom-rate' }; }
  if (preset === 'leaflets flyers' || preset === 'booklets brochures') return { vatRate: 0, vatClass: 'zero', vatReason: 'product-tax-settings-zero-rated-preset' };
  if (['business cards', 'signage banners', 'stickers labels', 'design service'].includes(preset)) return { vatRate: global.standardVatRate, vatClass: 'standard', vatReason: 'product-tax-settings-standard-rated-preset' };
  return null;
}

export function resolveVatProfileForItem(item: Record<string, any>): VatProfile {
  const global = getGlobalVatSettingsSync();
  const source = combinedText(item);
  if (!global.enabled) return { vatRate: 0, vatClass: 'zero', vatReason: 'global-vat-engine-disabled' };
  const settingsProfile = profileFromTaxSettings(taxSettingsFrom(item), source);
  if (settingsProfile) return settingsProfile;
  const explicitRate = readExplicitRate(item);
  if (explicitRate !== null) return { vatRate: explicitRate, vatClass: classFromRate(explicitRate), vatReason: 'explicit-item-vat-rate' };
  const taxClass = readTaxClass(item);
  if (taxClass.includes('zero') || taxClass.includes('0')) return { vatRate: 0, vatClass: 'zero', vatReason: 'explicit-zero-tax-class' };
  if (taxClass.includes('exempt')) return { vatRate: 0, vatClass: 'exempt', vatReason: 'explicit-exempt-tax-class' };
  if (taxClass.includes('standard') || taxClass.includes('20')) return { vatRate: global.standardVatRate, vatClass: 'standard', vatReason: 'explicit-standard-tax-class' };
  if (hasAny(source, termsList(global.standardRatedServiceTerms))) return { vatRate: global.designServiceVatRate, vatClass: classFromRate(global.designServiceVatRate), vatReason: 'global-standard-rated-service-term' };
  if (hasAny(source, termsList(global.standardRatedProductTerms))) return { vatRate: global.standardVatRate, vatClass: 'standard', vatReason: 'global-standard-rated-product-term' };
  if (hasAny(source, termsList(global.zeroRatedProductTerms))) return { vatRate: 0, vatClass: 'zero', vatReason: 'global-zero-rated-product-term' };
  const fallbackRate = classToRate(global.defaultVatClass, global.standardVatRate, global.defaultFallbackVatRate);
  return { vatRate: fallbackRate, vatClass: global.defaultVatClass === 'standard' ? 'standard' : global.defaultVatClass === 'exempt' ? 'exempt' : classFromRate(fallbackRate), vatReason: 'global-default-vat-fallback' };
}

export function calculateVatLine(item: Record<string, any>, quantity: number, grossMinorInput: number): VatLineCalculation {
  const profile = resolveVatProfileForItem(item);
  const grossMinor = minor(grossMinorInput) || moneyToMinor(item.totalPrice ?? item.total ?? item.lineTotal ?? item.price) || 0;
  const rate = profile.vatRate;
  const netMinor = rate > 0 ? Math.round(grossMinor / (1 + rate / 100)) : grossMinor;
  const vatMinor = Math.max(0, grossMinor - netMinor);
  const safeQty = Math.max(1, Math.round(Number(quantity || 1)));
  return { ...profile, quantity: safeQty, grossMinor, netMinor, vatMinor, unitGrossMinor: Math.round(grossMinor / safeQty), unitNetMinor: Math.round(netMinor / safeQty) };
}

export function calculateDeliveryVat(delivery: Record<string, any> | undefined, shippingGrossMinor: number) {
  const global = getGlobalVatSettingsSync();
  if (!global.enabled) {
    const grossMinor = minor(shippingGrossMinor);
    return { vatRate: 0, vatClass: 'zero', vatReason: 'global-vat-engine-disabled', grossMinor, netMinor: grossMinor, vatMinor: 0 };
  }
  const taxClass = text(delivery?.taxClass || delivery?.vatClass || delivery?.metadataJson?.taxClass || delivery?.metadataJson?.vatClass || global.deliveryVatClass);
  const explicit = numberOrNull(delivery?.vatRate ?? delivery?.taxRate ?? delivery?.metadataJson?.vatRate ?? delivery?.metadataJson?.taxRate);
  const vatRate = explicit !== null ? explicit : taxClass.includes('zero') || taxClass.includes('exempt') ? 0 : taxClass.includes('custom') ? global.deliveryVatRate : global.standardVatRate;
  const grossMinor = minor(shippingGrossMinor);
  const netMinor = vatRate > 0 ? Math.round(grossMinor / (1 + vatRate / 100)) : grossMinor;
  return { vatRate, vatClass: vatRate === 0 ? (taxClass.includes('exempt') ? 'exempt' : 'zero') : classFromRate(vatRate), vatReason: explicit !== null ? 'explicit-delivery-vat-rate' : 'global-delivery-vat-default', grossMinor, netMinor, vatMinor: Math.max(0, grossMinor - netMinor) };
}
