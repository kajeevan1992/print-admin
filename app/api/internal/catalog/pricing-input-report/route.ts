import { NextResponse } from 'next/server';
import { listInternalCatalogArray } from '../../../../../src/core/catalog/internal-catalog.service';
import { buildPricingInputSummary } from '../../../../../src/core/catalog/pricing-inputs';
import { tenantContextFromRequest } from '../../../../../src/core/tenant/context';

export async function GET(request: Request) {
  try {
    const ctx = tenantContextFromRequest(request);
    const products = await listInternalCatalogArray(ctx, 'products', { limit: 200 });
    const summaries = products.map(buildPricingInputSummary);
    const ready = summaries.filter((item) => item.ready).length;
    return NextResponse.json({ ok: true, source: 'internal-core-db', data: { ready, total: summaries.length, items: summaries } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pricing input report failed.';
    return NextResponse.json({ ok: false, source: 'internal-core', error: message }, { status: 500 });
  }
}
