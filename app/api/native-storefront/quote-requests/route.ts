import { NextRequest, NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';

const CONFIG_RESOURCE = 'admin-config' as any;
const QUOTES_STORE_KEY = 'admin_quotes_store';

function clean(value: FormDataEntryValue | null) { return String(value || '').trim(); }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function stamp() { return new Date().toISOString().slice(0, 16).replace('T', ' '); }
function titleFromSlug(value: string) { return String(value || '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }
function parseSelectedOptions(value: string) { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function optionSummary(items: any[]) { return items.map((item) => `${item?.label || item?.key}: ${item?.value || item?.slug}`).filter(Boolean).join(', '); }

async function resolveTenantId(tenantSlug: string) {
  const tenant = await platformPrisma.tenant.findFirst({ where: { OR: [{ id: tenantSlug }, { slug: tenantSlug }, { defaultSubdomain: tenantSlug }] }, select: { id: true } });
  return tenant?.id || tenantSlug;
}

async function existingQuotes(tenantId: string) {
  try {
    const record = await getInternalCatalogRecord({ tenantId }, CONFIG_RESOURCE, QUOTES_STORE_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tenantSlug = slug(clean(form.get('tenantSlug')));
  const storeSlug = slug(clean(form.get('storeSlug')));
  const productSlug = slug(clean(form.get('productSlug')));
  const categorySlug = slug(clean(form.get('categorySlug')));
  const customerName = clean(form.get('customerName'));
  const email = clean(form.get('email'));
  const phone = clean(form.get('phone'));
  const quantity = clean(form.get('quantity'));
  const deadline = clean(form.get('deadline'));
  const artworkStatus = clean(form.get('artworkStatus'));
  const notes = clean(form.get('notes'));
  const selectedOptions = parseSelectedOptions(clean(form.get('selectedOptions')));
  const selectedOptionsSummary = optionSummary(selectedOptions);

  if (!tenantSlug || !storeSlug || !productSlug || !customerName || (!email && !phone)) return NextResponse.json({ ok: false, error: 'Missing required quote request details.' }, { status: 400 });

  const tenantId = await resolveTenantId(tenantSlug);
  const id = `qt-${Date.now()}`;
  const quote = {
    id,
    customer: customerName,
    title: `${titleFromSlug(productSlug) || 'Print'} enquiry`,
    channel: storeSlug || 'Native Storefront',
    status: 'draft',
    total: 0,
    updatedAt: stamp(),
    source: 'native-storefront',
    metadataJson: { tenantId, tenantSlug, storeSlug, categorySlug, productSlug, customerName, email, phone, quantity, deadline, artworkStatus, notes, selectedOptions, selectedOptionsSummary },
  };

  const items = await existingQuotes(tenantId);
  const next = [quote, ...items.filter((item: any) => item.id !== id)];
  await upsertInternalCatalogRecord({ tenantId }, CONFIG_RESOURCE, { id: QUOTES_STORE_KEY, slug: QUOTES_STORE_KEY, name: QUOTES_STORE_KEY, description: 'Operations workspace records', metadataJson: { items: next, savedAt: new Date().toISOString(), storageKey: QUOTES_STORE_KEY, source: 'NativeStorefrontQuoteRequest' } } as any);

  return NextResponse.redirect(new URL(`/native-stores/${tenantSlug}/${storeSlug}/${categorySlug}/${productSlug}?quote=${id}`, request.url), { status: 303 });
}
