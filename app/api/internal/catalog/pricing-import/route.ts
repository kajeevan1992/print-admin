import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { writeInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CsvRow = Record<string, string>;
type CsvColumnMap = {
  sku?: string;
  oldSku?: string;
  productTitle?: string;
  price: string;
  vatRate?: string;
  quantity: string;
};

const SYSTEM_KEYS = new Set(['sku', 'oldSku', 'productTitle', 'price', 'vatRate']);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'imported-product';
}

function normaliseHeader(value: string) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .replace(/[£$€]/g, '')
    .replace(/[%()\[\]{}]/g, ' ')
    .replace(/[_\-\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function uniqueKey(base: string, used: Set<string>) {
  const root = slugify(base);
  let next = root;
  let index = 2;
  while (used.has(next)) {
    next = `${root}-${index}`;
    index += 1;
  }
  used.add(next);
  return next;
}

function storefrontDisplayType(header: string) {
  const key = header.toLowerCase();
  if (key.includes('quantity') || key.includes('qty') || key.includes('sets')) return 'quantity-grid';
  if (key.includes('paper') || key.includes('material') || key.includes('lamination') || key.includes('finish') || key.includes('cover')) return 'cards';
  if (key.includes('turnaround') || key.includes('size') || key.includes('print type') || key.includes('orientation')) return 'buttons';
  return 'dropdown';
}

function optionType(header: string) {
  const key = header.toLowerCase();
  if (key.includes('quantity') || key.includes('qty') || key.includes('sets') || key.includes('page number')) return 'quantity';
  return 'select';
}

function detectDelimiter(headerLine: string) {
  const delimiters = [',', ';', '\t'];
  return delimiters
    .map((delimiter) => ({ delimiter, count: headerLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
}

function parseCsvLine(line: string, delimiter: string) {
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

    if (char === delimiter && !quoted) {
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

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header) => header.replace(/^\uFEFF/, '').trim());
  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line, delimiter);
    if (values.length < headers.length) continue;
    const row: CsvRow = {};
    headers.forEach((header, index) => { row[header] = values[index] || ''; });
    rows.push(row);
  }

  if (!rows.length) throw new Error('CSV was read, but no valid rows matched the header columns. Check the delimiter and column count.');
  return { headers, rows, delimiter };
}

function headerMatches(header: string, aliases: string[]) {
  const normal = normaliseHeader(header);
  return aliases.some((alias) => normal === alias || normal.includes(alias));
}

function findHeader(headers: string[], aliases: string[]) {
  return headers.find((header) => headerMatches(header, aliases));
}

function resolveColumns(headers: string[]): CsvColumnMap {
  const price = findHeader(headers, ['price', 'selling price', 'sell price', 'retail price', 'customer price', 'sale price', 'amount', 'cost']);
  const quantity = findHeader(headers, ['quantity', 'qty', 'sets', 'copies', 'run quantity', 'order quantity', 'minimum quantity']);
  if (!price) throw new Error(`CSV is missing a price column. Accepted names include: Price £, Price, Selling Price, Sell Price, Retail Price.`);
  if (!quantity) throw new Error(`CSV is missing a quantity column. Accepted names include: Quantity, Qty, Sets, Copies.`);
  return {
    sku: findHeader(headers, ['sku', 'product code', 'code', 'item number', 'item no']),
    oldSku: findHeader(headers, ['oldsku', 'old sku', 'old product code', 'legacy sku']),
    productTitle: findHeader(headers, ['product title', 'product name', 'title', 'name']),
    price,
    vatRate: findHeader(headers, ['vat rate', 'vat', 'tax rate', 'tax']),
    quantity,
  };
}

function systemHeaders(columns: CsvColumnMap) {
  return new Set(Object.values(columns).filter(Boolean) as string[]);
}

function moneyToMinor(value: string) {
  const clean = String(value || '').replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  const parsed = Number(clean);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function numberValue(value: string) {
  const parsed = Number(String(value || '').replace(/,/g, '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function titleFromSlug(slug: string) {
  return slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function buildOptionGroups(headers: string[], rows: CsvRow[], columns: CsvColumnMap) {
  const usedKeys = new Set<string>();
  const system = systemHeaders(columns);

  return headers
    .filter((header) => !system.has(header))
    .map((header, index) => {
      const key = uniqueKey(header, usedKeys);
      const values = Array.from(new Set(rows.map((row) => row[header]).filter((value) => String(value || '').trim().length > 0)))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      if (!values.length) return null;

      return {
        id: key,
        key,
        name: header,
        label: header,
        type: optionType(header),
        inputType: optionType(header),
        storefrontDisplayType: storefrontDisplayType(header),
        displayType: storefrontDisplayType(header),
        required: true,
        sortOrder: index + 1,
        values: values.map((value, valueIndex) => ({
          id: `${key}-${slugify(value)}`,
          key: slugify(value),
          label: value,
          value,
          sortOrder: valueIndex + 1,
        })),
      };
    })
    .filter(Boolean);
}

function buildPriceRows(headers: string[], rows: CsvRow[], markupPercent: number, columns: CsvColumnMap) {
  const usedKeys = new Set<string>();
  const system = systemHeaders(columns);
  const optionColumns = headers
    .filter((header) => !system.has(header))
    .map((header) => ({ header, key: uniqueKey(header, usedKeys) }));

  return rows.map((row) => {
    const supplierPriceMinor = moneyToMinor(row[columns.price]);
    const priceMinor = Math.round(supplierPriceMinor * (1 + Math.max(0, markupPercent) / 100));
    const options = Object.fromEntries(optionColumns.map(({ header, key }) => [key, row[header] || '']).filter(([, value]) => String(value || '').trim().length > 0));

    return {
      sku: columns.sku ? row[columns.sku] : '',
      oldSku: columns.oldSku ? row[columns.oldSku] : '',
      quantity: numberValue(row[columns.quantity]),
      options,
      vatRate: columns.vatRate ? numberValue(row[columns.vatRate]) ?? 20 : 20,
      supplierPriceMinor,
      priceMinor,
      currency: 'GBP',
    };
  }).filter((row) => row.quantity !== null && row.priceMinor > 0);
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

    const { headers, rows, delimiter } = parseCsv(input.csvText);
    const columns = resolveColumns(headers);
    const firstProductTitle = columns.productTitle ? rows.find((row) => row[columns.productTitle!]?.trim())?.[columns.productTitle!]?.trim() : '';
    const productSlug = slugify(input.productSlug || firstProductTitle || input.fileName.replace(/\.csv$/i, '') || 'business-cards');
    const productName = input.productName || firstProductTitle || titleFromSlug(productSlug);
    const optionGroups = buildOptionGroups(headers, rows, columns);
    const priceRows = buildPriceRows(headers, rows, input.markupPercent, columns);
    if (!priceRows.length) throw new Error(`CSV columns were found, but no valid price rows were imported. Check ${columns.quantity} and ${columns.price} values.`);
    const priceFromMinor = Math.min(...priceRows.map((row) => row.priceMinor).filter((value) => value > 0));

    const product = await writeInternalCatalogRecord(tenantContextFromRequest(request), 'products', {
      slug: productSlug,
      title: productName,
      name: productName,
      description: `Imported CSV pricing matrix with ${priceRows.length} price rows.`,
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
          rowCount: priceRows.length,
          rawRowCount: rows.length,
          columns: headers,
          columnMap: columns,
          delimiter,
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
        rowCount: priceRows.length,
        optionGroupCount: optionGroups.length,
        priceFromMinor: Number.isFinite(priceFromMinor) ? priceFromMinor : null,
        productSlug,
        productName,
        detectedColumns: columns,
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
