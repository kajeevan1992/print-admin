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

function numberOrNull(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? next : null;
}
function minor(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? Math.round(next) : 0;
}
function moneyToMinor(value: unknown) {
  const next = Number(value);
  if (!Number.isFinite(next) || next < 0) return 0;
  return next > 10000 ? Math.round(next) : Math.round(next * 100);
}
function text(value: unknown) {
  return String(value || '').toLowerCase().replace(/[_-]+/g, ' ');
}
function combinedText(item: Record<string, any>) {
  const meta = item.metadataJson || item.metadata || {};
  const config = item.config || item.selections || item.options || {};
  return [
    item.name, item.title, item.productName, item.titleSnapshot, item.productId, item.slug, item.sku,
    item.categoryName, item.categorySlug, item.productCategory, item.taxClass, item.vatClass,
    meta.name, meta.title, meta.productName, meta.categoryName, meta.categorySlug, meta.taxClass, meta.vatClass,
    config.name, config.title, config.productName, config.categoryName, config.categorySlug, config.taxClass, config.vatClass,
  ].map(text).filter(Boolean).join(' ');
}
function readExplicitRate(item: Record<string, any>) {
  const meta = item.metadataJson || item.metadata || {};
  const config = item.config || item.selections || item.options || {};
  const resolver = item.resolverSnapshot || {};
  const candidates = [
    item.vatRate, item.taxRate, item.vat_rate, item.tax_rate,
    meta.vatRate, meta.taxRate, meta.vat_rate, meta.tax_rate,
    config.vatRate, config.taxRate, config.vat_rate, config.tax_rate,
    resolver.vatRate, resolver.taxRate, resolver.product?.vatRate, resolver.product?.taxRate,
    resolver.pricing?.vatRate, resolver.pricing?.selected?.vatRate,
  ];
  for (const candidate of candidates) {
    const rate = numberOrNull(candidate);
    if (rate !== null) return rate;
  }
  return null;
}
function readTaxClass(item: Record<string, any>) {
  const meta = item.metadataJson || item.metadata || {};
  const config = item.config || item.selections || item.options || {};
  const resolver = item.resolverSnapshot || {};
  return text(item.vatClass || item.taxClass || meta.vatClass || meta.taxClass || config.vatClass || config.taxClass || resolver.product?.vatClass || resolver.product?.taxClass || resolver.pricing?.taxClass || '');
}
function hasAny(source: string, words: string[]) {
  return words.some((word) => source.includes(word));
}

const ZERO_RATED_PRINT_TERMS = ['leaflet', 'leaflets', 'flyer', 'flyers', 'booklet', 'booklets', 'brochure', 'brochures'];
const STANDARD_PRINT_TERMS = ['business card', 'business cards', 'card ', 'cards ', 'board', 'boards', 'sign', 'signage', 'banner', 'banners', 'sticker', 'stickers', 'label', 'labels', 'ncr', 'pvc', 'poster', 'posters'];
const STANDARD_SERVICE_TERMS = ['design', 'artwork service', 'artwork check', 'proof', 'proofing', 'setup', 'installation', 'fitting', 'file fix', 'file setup', 'consultation'];

export function resolveVatProfileForItem(item: Record<string, any>): VatProfile {
  const explicitRate = readExplicitRate(item);
  if (explicitRate !== null) return { vatRate: explicitRate, vatClass: explicitRate === 0 ? 'zero' : explicitRate === 20 ? 'standard' : 'custom', vatReason: 'explicit-item-vat-rate' };
  const taxClass = readTaxClass(item);
  if (taxClass.includes('zero') || taxClass.includes('0')) return { vatRate: 0, vatClass: 'zero', vatReason: 'explicit-zero-tax-class' };
  if (taxClass.includes('exempt')) return { vatRate: 0, vatClass: 'exempt', vatReason: 'explicit-exempt-tax-class' };
  if (taxClass.includes('standard') || taxClass.includes('20')) return { vatRate: 20, vatClass: 'standard', vatReason: 'explicit-standard-tax-class' };
  const source = combinedText(item);
  if (hasAny(source, STANDARD_SERVICE_TERMS)) return { vatRate: 20, vatClass: 'standard', vatReason: 'standard-rated-service-or-add-on' };
  if (hasAny(source, STANDARD_PRINT_TERMS)) return { vatRate: 20, vatClass: 'standard', vatReason: 'standard-rated-print-product-fallback' };
  if (hasAny(source, ZERO_RATED_PRINT_TERMS)) return { vatRate: 0, vatClass: 'zero', vatReason: 'zero-rated-printed-matter-fallback' };
  return { vatRate: 20, vatClass: 'standard', vatReason: 'default-standard-vat-fallback' };
}

export function calculateVatLine(item: Record<string, any>, quantity: number, grossMinorInput: number): VatLineCalculation {
  const profile = resolveVatProfileForItem(item);
  const grossMinor = minor(grossMinorInput) || moneyToMinor(item.totalPrice ?? item.total ?? item.lineTotal ?? item.price) || 0;
  const rate = profile.vatRate;
  const netMinor = rate > 0 ? Math.round(grossMinor / (1 + rate / 100)) : grossMinor;
  const vatMinor = Math.max(0, grossMinor - netMinor);
  const safeQty = Math.max(1, Math.round(Number(quantity || 1)));
  return {
    ...profile,
    quantity: safeQty,
    grossMinor,
    netMinor,
    vatMinor,
    unitGrossMinor: Math.round(grossMinor / safeQty),
    unitNetMinor: Math.round(netMinor / safeQty),
  };
}

export function calculateDeliveryVat(delivery: Record<string, any> | undefined, shippingGrossMinor: number) {
  const taxClass = text(delivery?.taxClass || delivery?.vatClass || delivery?.metadataJson?.taxClass || delivery?.metadataJson?.vatClass || 'standard');
  const explicit = numberOrNull(delivery?.vatRate ?? delivery?.taxRate ?? delivery?.metadataJson?.vatRate ?? delivery?.metadataJson?.taxRate);
  const vatRate = explicit !== null ? explicit : taxClass.includes('zero') || taxClass.includes('exempt') ? 0 : 20;
  const grossMinor = minor(shippingGrossMinor);
  const netMinor = vatRate > 0 ? Math.round(grossMinor / (1 + vatRate / 100)) : grossMinor;
  return {
    vatRate,
    vatClass: vatRate === 0 ? 'zero' : vatRate === 20 ? 'standard' : 'custom',
    vatReason: explicit !== null ? 'explicit-delivery-vat-rate' : 'delivery-tax-class',
    grossMinor,
    netMinor,
    vatMinor: Math.max(0, grossMinor - netMinor),
  };
}
