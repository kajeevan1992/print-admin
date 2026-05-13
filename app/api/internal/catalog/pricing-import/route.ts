import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { writeInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CsvRow = Record<string, string>;

const PRICE_COLUMN = 'Price £';
const VAT_COLUMN = 'VAT Rate';
const PRODUCT_TITLE_COLUMN = 'Product Title';
const SYSTEM_COLUMNS = new Set(['SKU', 'OldSKU', PRODUCT_TITLE_COLUMN, PRICE_COLUMN, VAT_COLUMN]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'imported-product';
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length);
  if (lines.length < 2) throw new Error('CSV must include a header row and at least one price row.');

  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, '').trim());
  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) continue;
    const row: CsvRow = {};
    headers.forEach((header, index) => { row[header] = values[index] || ''; });
    rows.push(row);
  }

  return { headers, rows };
}

function moneyToMinor(value: string) {
  const parsed = Number(String(value || '').replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function numberValue(value: string) {
  const parsed = Number(String(value || '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function titleFromSlug(slug: string) {
  return slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function buildOptionGroups(headers: string[], rows: CsvRow[]) {
  return headers
    .filter((header) => !SYSTEM_COLUMNS.has(header))
    .map((header, index) => {
      const values = Array.from(new Set(rows.map((row) => row[header]).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      return {
        id: slugify(header),
        label: header,
        type: header.toLowerCase().includes('quantity') ? 'quantity' : 'select',
        required: true,
        sortOrder: index + 1,
        values: values.map((value) => ({ label: value, value })),
      };
    });
}

function buildPriceRows(headers: string[], rows: CsvRow[], markupPercent: number) {
  const optionColumns = headers.filter((header) => !SYSTEM_COLUMNS.has(header));

  return rows.map((row) => {
    const supplierPriceMinor = moneyToMinor(row[PRICE_COLUMN]);
    const priceMinor = Math.round(supplierPriceMinor * (1 + Math.max(0, markupPercent) / 100));
    const options = Object.fromEntries(optionColumns.map((column) => [slugify(column), row[column] || '']));

    return {
      sku: row.SKU,
      oldSku: row.OldSKU,
      quantity: numberValue(row.Quantity),
      options,
      vatRate: numberValue(row[VAT_COLUMN]) ?? 20,
      supplierPriceMinor,
      priceMinor,
      currency: 'GBP',
    };
  });
}

async function readImportInput(request: Request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    const csvText = file instanceof File ? await file.text() : String(form.get('csvText') || '');
    return {
      csvText,
      productSlug: String(form.get('productSlug') || ''),
      productName: String(form.get('productName') || ''),
      categoryId: String(form.get('categoryId') || ''),
      markupPercent: Number(form.get('markupPercent') || 0),
      fileName: file instanceof File ? file.name : String(form.get('fileName') || ''),
    };
  }

  const body = await request.json().catch(() => ({}));
  return {
    csvText: String(body.csvText || ''),
    productSlug: String(body.productSlug || ''),
    productName: String(body.productName || ''),
    categoryId: String(body.categoryId || ''),
    markupPercent: Number(body.markupPercent || 0),
    fileName: String(body.fileName || ''),
  };
}

export async function POST(request: Request) {
  try {
    const input = await readImportInput(request);
    if (!input.csvText.trim()) throw new Error('CSV import requires csvText or multipart file upload.');

    const { headers, rows } = parseCsv(input.csvText);
    if (!headers.includes(PRICE_COLUMN)) throw new Error(`CSV is missing required column: ${PRICE_COLUMN}`);
    if (!headers.includes('Quantity')) throw new Error('CSV is missing required column: Quantity');

    const firstProductTitle = rows.find((row) => row[PRODUCT_TITLE_COLUMN]?.trim())?.[PRODUCT_TITLE_COLUMN]?.trim();
    const productSlug = slugify(input.productSlug || firstProductTitle || input.fileName.replace(/\.csv$/i, '') || 'business-cards');
    const productName = input.productName || firstProductTitle || titleFromSlug(productSlug);
    const optionGroups = buildOptionGroups(headers, rows);
    const priceRows = buildPriceRows(headers, rows, input.markupPercent);
    const priceFromMinor = Math.min(...priceRows.map((row) => row.priceMinor).filter((value) => value > 0));

    const product = await writeInternalCatalogRecord(tenantContextFromRequest(request), 'products', {
      slug: productSlug,
      title: productName,
      name: productName,
      description: `Imported CSV pricing matrix with ${rows.length} price rows.`,
      categoryId: input.categoryId || undefined,
      isActive: true,
      isGlobal: false,
      priceFromMinor: Number.isFinite(priceFromMinor) ? priceFromMinor : null,
      currency: 'GBP',
      productType: 'online',
      metadataJson: {
        pricingSource: 'csv-matrix',
        csvImport: {
          fileName: input.fileName || null,
          importedAt: new Date().toISOString(),
          rowCount: rows.length,
          columns: headers,
          markupPercent: input.markupPercent,
        },
        optionGroups,
        pricingMatrix: {
          type: 'exact-option-match',
          currency: 'GBP',
          rows: priceRows,
        },
      },
    }, 'upsert');

    return NextResponse.json({
      ok: true,
      source: 'internal-catalog-csv-import',
      data: {
        product,
        rowCount: rows.length,
        optionGroupCount: optionGroups.length,
        priceFromMinor: Number.isFinite(priceFromMinor) ? priceFromMinor : null,
        productSlug,
        productName,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: 'internal-catalog-csv-import',
      error: error instanceof Error ? error.message : 'CSV pricing import failed.',
    }, { status: 500 });
  }
}
