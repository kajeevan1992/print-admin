import { getInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { createFormalQuote } from './formal-quotes.service';

const CONFIG_RESOURCE = 'admin-config' as any;
const LEGACY_KEY = 'admin_quotes_store';
function clean(value: unknown) { return String(value || '').trim(); }
function number(value: unknown) { const next = Number(value); return Number.isFinite(next) ? next : 0; }

export async function migrateLegacyQuotesIfNeeded(tenantSlug: string, existingCount: number) {
  if (existingCount > 0) return { migrated: 0, skipped: true };
  let record: any = null;
  try { record = await getInternalCatalogRecord({ tenantId: tenantSlug }, CONFIG_RESOURCE, LEGACY_KEY); } catch { return { migrated: 0, skipped: true }; }
  const items = Array.isArray(record?.metadataJson?.items) ? record.metadataJson.items : [];
  let migrated = 0;
  for (const item of items.slice().reverse()) {
    const meta = item?.metadataJson && typeof item.metadataJson === 'object' ? item.metadataJson : {};
    const totalMinor = Math.max(0, Math.round(number(item?.total) * 100));
    const quantity = Math.max(1, Math.round(number(meta.quantity) || 1));
    const netMinor = totalMinor ? Math.round(totalMinor / 1.2) : 0;
    const vatMinor = Math.max(0, totalMinor - netMinor);
    try {
      await createFormalQuote({ tenantSlug, storeSlug: clean(meta.storeSlug || item.channel || 'main'), customerName: clean(meta.customerName || item.customer || 'Customer'), customerEmail: clean(meta.email), customerPhone: clean(meta.phone), title: clean(item.title || 'Legacy quotation'), status: item.status === 'sent' || item.status === 'approved' || item.status === 'expired' ? item.status : 'draft', currency: 'GBP', customerNotes: clean(meta.notes), internalNotes: `Migrated from legacy quote ${clean(item.id)}.`, lines: [{ productId: clean(meta.productSlug || 'legacy-custom'), productSlug: clean(meta.productSlug), categorySlug: clean(meta.categorySlug), productName: clean(meta.productName || item.title || 'Print item'), quantity, netMinor, vatMinor, grossMinor: totalMinor, vatRate: totalMinor ? 20 : 0, selectedOptions: Array.isArray(meta.selectedOptions) ? meta.selectedOptions : [], metadataJson: { ...meta, legacyQuoteId: clean(item.id), source: 'legacy-admin-quotes-store' } }], actorType: 'migration', actorId: 'legacy-admin-quotes-store' });
      migrated += 1;
    } catch {}
  }
  return { migrated, skipped: false };
}
