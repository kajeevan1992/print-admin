import { NextResponse } from 'next/server';
import { handleCatalogDelete, handleCatalogWrite } from '@/core/catalog/internal-catalog-http';
import { listInternalCatalog } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

const resource = 'products' as const;

function readOptions(request: Request) {
  const url = new URL(request.url);
  return {
    search: url.searchParams.get('search') || undefined,
    page: Number(url.searchParams.get('page') || 1),
    limit: Number(url.searchParams.get('limit') || 50),
  };
}

function productListSummary(item: unknown) {
  if (!item || typeof item !== 'object') return item;
  const record = item as Record<string, any>;
  const metadata = record.metadataJson && typeof record.metadataJson === 'object' ? record.metadataJson as Record<string, any> : {};
  const rowCount = Array.isArray(metadata?.pricingMatrix?.rows) ? metadata.pricingMatrix.rows.length : Number(metadata?.pricingMatrix?.rowCount || metadata?.csvImport?.rowCount || 0);
  const optionGroups = Array.isArray(metadata.optionGroups) ? metadata.optionGroups : Array.isArray(record.optionGroups) ? record.optionGroups : [];
  const compactGroups = optionGroups.map((group: Record<string, any>) => ({
    id: group.id,
    key: group.key,
    name: group.name,
    label: group.label,
    type: group.type,
    inputType: group.inputType,
    storefrontDisplayType: group.storefrontDisplayType,
    displayType: group.displayType,
    required: group.required,
    sortOrder: group.sortOrder,
    valueCount: Array.isArray(group.values) ? group.values.length : 0,
    values: Array.isArray(group.values) ? group.values.slice(0, 12) : [],
  }));
  return {
    ...record,
    optionGroups: compactGroups,
    pricingMatrixRowCount: rowCount,
    metadataJson: {
      pricingSource: metadata.pricingSource,
      csvImport: metadata.csvImport ? { ...metadata.csvImport, rowsPreviewed: false } : undefined,
      optionGroups: compactGroups,
      pricingMatrix: metadata.pricingMatrix ? { type: metadata.pricingMatrix.type, currency: metadata.pricingMatrix.currency, rowCount, rows: [] } : undefined,
    },
  };
}

export async function GET(request: Request) {
  try {
    const data = await listInternalCatalog(tenantContextFromRequest(request), resource, readOptions(request));
    const safeData = { ...data, items: Array.isArray(data.items) ? data.items.map(productListSummary) : [] };
    return NextResponse.json({ ok: true, source: 'internal-core-db', data: safeData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Products could not load.';
    return NextResponse.json({ ok: false, source: 'internal-core-db', error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleCatalogWrite(request, resource);
}

export async function PUT(request: Request) {
  return handleCatalogWrite(request, resource);
}

export async function PATCH(request: Request) {
  return handleCatalogWrite(request, resource);
}

export async function DELETE(request: Request) {
  return handleCatalogDelete(request, resource);
}
