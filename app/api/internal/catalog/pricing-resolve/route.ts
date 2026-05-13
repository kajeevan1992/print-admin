import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { getInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PricingRow = {
  sku?: string;
  oldSku?: string;
  quantity?: number | null;
  options?: Record<string, string>;
  vatRate?: number;
  supplierPriceMinor?: number;
  priceMinor?: number;
  currency?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeValue(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeSelections(input: Record<string, unknown>) {
  const raw = input.options && typeof input.options === 'object' && !Array.isArray(input.options)
    ? input.options as Record<string, unknown>
    : input;

  const next: Record<string, string> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null || value === '') continue;
    next[key] = String(value);
    next[slugify(key)] = String(value);
  }

  return next;
}

function rowsFromProduct(product: any): PricingRow[] {
  const directRows = product?.pricingMatrix?.rows;
  const metadataRows = product?.metadataJson?.pricingMatrix?.rows;
  const rows = Array.isArray(directRows) ? directRows : Array.isArray(metadataRows) ? metadataRows : [];
  return rows as PricingRow[];
}

function optionGroupsFromProduct(product: any) {
  const direct = product?.optionGroups;
  const metadata = product?.metadataJson?.optionGroups;
  return Array.isArray(direct) ? direct : Array.isArray(metadata) ? metadata : [];
}

function exactMatch(row: PricingRow, selections: Record<string, string>) {
  const rowOptions = row.options || {};

  for (const [key, rowValue] of Object.entries(rowOptions)) {
    const selectedValue = selections[key] ?? selections[slugify(key)];
    if (normalizeValue(selectedValue) !== normalizeValue(rowValue)) return false;
  }

  return true;
}

function scorePartialMatch(row: PricingRow, selections: Record<string, string>) {
  const rowOptions = row.options || {};
  let score = 0;
  let misses = 0;

  for (const [key, rowValue] of Object.entries(rowOptions)) {
    const selectedValue = selections[key] ?? selections[slugify(key)];
    if (!selectedValue) {
      misses += 1;
      continue;
    }
    if (normalizeValue(selectedValue) === normalizeValue(rowValue)) score += 1;
    else misses += 1;
  }

  return { score, misses };
}

function findAlternatives(rows: PricingRow[], selections: Record<string, string>) {
  return rows
    .map((row) => ({ row, ...scorePartialMatch(row, selections) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.misses - b.misses || (a.row.priceMinor || 0) - (b.row.priceMinor || 0))
    .slice(0, 10)
    .map((item) => item.row);
}

async function readBody(request: Request) {
  const body = await request.json().catch(() => ({}));
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const productId = String(body.productId || body.productSlug || body.slug || '').trim();
    if (!productId) throw new Error('Pricing resolve requires productId or productSlug.');

    const product = await getInternalCatalogRecord(tenantContextFromRequest(request), 'products', productId);
    const rows = rowsFromProduct(product);
    if (!rows.length) throw new Error(`Product ${productId} does not have an imported CSV pricing matrix.`);

    const selections = normalizeSelections(body);
    const match = rows.find((row) => exactMatch(row, selections));

    if (!match) {
      return NextResponse.json({
        ok: false,
        source: 'internal-catalog-pricing-resolver',
        error: 'No exact price match found for the selected options.',
        data: {
          productId,
          selections,
          optionGroups: optionGroupsFromProduct(product),
          alternatives: findAlternatives(rows, selections),
        },
      }, { status: 404 });
    }

    const priceMinor = Number(match.priceMinor || 0);
    const vatRate = Number(match.vatRate ?? 20);
    const vatMinor = Math.round(priceMinor * (vatRate / 100));
    const totalMinor = priceMinor + vatMinor;

    return NextResponse.json({
      ok: true,
      source: 'internal-catalog-pricing-resolver',
      data: {
        product: {
          id: product.id,
          slug: product.slug,
          name: product.name || product.title,
        },
        sku: match.sku,
        oldSku: match.oldSku,
        quantity: match.quantity,
        options: match.options,
        currency: match.currency || 'GBP',
        netMinor: priceMinor,
        vatRate,
        vatMinor,
        grossMinor: totalMinor,
        supplierPriceMinor: match.supplierPriceMinor || null,
        matchedRow: match,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: 'internal-catalog-pricing-resolver',
      error: error instanceof Error ? error.message : 'Pricing resolve failed.',
    }, { status: 500 });
  }
}
