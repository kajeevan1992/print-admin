export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const VAT_KEY = 'storefront-vat-engine-foundation';
const LEDGER_KEY = 'storefront-finance-ledger';

type VatClass = 'zero' | 'standard';
type VatLine = { id: string; label: string; lineType: 'product' | 'addon' | 'service'; vatClass: VatClass; netMinor: number; vatMinor: number; grossMinor: number; currency: string; note?: string };

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'VAT engine request failed.' }, { status });
}
async function readRecord(request: NextRequest, key: string) {
  try { return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key); }
  catch (error) { if ((error instanceof Error ? error.message : '').includes('was not found')) return null; throw error; }
}
async function saveItems(request: NextRequest, items: VatLine[]) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, { id: VAT_KEY, slug: VAT_KEY, name: 'Line-item VAT foundation', description: 'Product/add-on VAT records: zero-rated print products can sit beside VAT-rated services.', metadataJson: { items, savedAt: new Date().toISOString(), storageKey: VAT_KEY, source: 'VatEngineFoundation' } } as any);
}
function calcVat(netMinor: number, vatClass: VatClass) { return vatClass === 'standard' ? Math.round(Number(netMinor || 0) * 0.2) : 0; }
function makeLine(id: string, label: string, lineType: VatLine['lineType'], vatClass: VatClass, netMinor: number, note: string): VatLine {
  const vatMinor = calcVat(netMinor, vatClass); return { id, label, lineType, vatClass, netMinor, vatMinor, grossMinor: netMinor + vatMinor, currency: 'GBP', note };
}
function defaultLines(): VatLine[] {
  return [
    makeLine('vat-line-booklet', 'Booklet product - zero rated', 'product', 'zero', 12000, 'Leaflets/booklets are product-level zero VAT.'),
    makeLine('vat-line-booklet-design', 'Design service add-on for booklet', 'service', 'standard', 4500, 'Design service remains standard VAT even when base product is zero-rated.'),
    makeLine('vat-line-business-cards', 'Business cards', 'product', 'standard', 6500, 'Business cards are standard VAT.'),
    makeLine('vat-line-foamex-board', 'Foamex board print', 'product', 'standard', 8900, 'Boards/signage are standard VAT.'),
  ];
}
function summarise(items: VatLine[]) { return { lineCount: items.length, zeroRatedCount: items.filter(i => i.vatClass === 'zero').length, standardRatedCount: items.filter(i => i.vatClass === 'standard').length, netTotalMinor: items.reduce((s,i)=>s+i.netMinor,0), vatTotalMinor: items.reduce((s,i)=>s+i.vatMinor,0), grossTotalMinor: items.reduce((s,i)=>s+i.grossMinor,0), currency: 'GBP' }; }
export async function GET(request: NextRequest) {
  try {
    const record = await readRecord(request, VAT_KEY);
    let items = ((record as any)?.metadataJson?.items || []) as VatLine[];
    if (!Array.isArray(items) || items.length === 0) { items = defaultLines(); await saveItems(request, items); }
    return NextResponse.json({ ok: true, source: 'internal-vat-engine-foundation-db', data: { items, summary: summarise(items), rules: { globalVatForbidden: true, productVatClasses: ['zero','standard'], designServiceVatClass: 'standard', mixedBasket: 'sum VAT per line item' } } });
  } catch (error) { return responseError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const record = await readRecord(request, VAT_KEY);
    const items = Array.isArray((record as any)?.metadataJson?.items) ? (record as any).metadataJson.items : defaultLines();
    if (body?.label && body?.netMinor) items.unshift(makeLine(`vat-line-${Date.now()}`, String(body.label), body.lineType === 'service' ? 'service' : 'product', body.vatClass === 'zero' ? 'zero' : 'standard', Number(body.netMinor), 'Manual VAT test line.'));
    await saveItems(request, items.slice(0, 100));
    return NextResponse.json({ ok: true, source: 'internal-vat-engine-foundation-db', data: { items, summary: summarise(items) }, item: { action: body.action || 'saved', at: new Date().toISOString() } });
  } catch (error) { return responseError(error); }
}
