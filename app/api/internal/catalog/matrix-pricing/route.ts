import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type MatrixFormat = 'table' | 'grid';
type MatrixRow = {
  qty: number;
  size?: string;
  material?: string;
  finish?: string;
  sides?: string;
  turnaround?: string;
  priceMinor: number;
  currency: string;
  sourceFormat: MatrixFormat;
};

type MatrixRecord = {
  productId: string;
  uploadedAt: string;
  detectedFormat: MatrixFormat;
  headers: string[];
  rows: MatrixRow[];
};

const matrixStore: Record<string, MatrixRecord> = {};

function key(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
}

function moneyToMinor(value: unknown): number {
  if (typeof value === 'number') return Math.round(value * 100);
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function rowsFromPayload(payload: any): Record<string, any>[] {
  const input = payload?.data ?? payload?.rows ?? payload;
  if (Array.isArray(input)) return input;
  if (typeof payload?.csv === 'string') {
    const lines = payload.csv.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
    const headers = String(lines.shift() || '').split(',').map((header) => header.trim());
    return lines.map((line: string) => {
      const values = line.split(',').map((value) => value.trim());
      return headers.reduce((row: Record<string, any>, header, index) => {
        row[header] = values[index] ?? '';
        return row;
      }, {});
    });
  }
  return [];
}

function read(row: Record<string, any>, names: string[]): any {
  const found = Object.keys(row).find((candidate) => names.includes(key(candidate)));
  return found ? row[found] : undefined;
}

function isTable(rows: Record<string, any>[]): boolean {
  const first = rows[0] || {};
  const keys = Object.keys(first).map(key);
  const hasQty = keys.includes('qty') || keys.includes('quantity');
  const hasPrice = keys.includes('price') || keys.includes('price_minor') || keys.includes('standard') || keys.includes('express') || keys.includes('rush') || keys.includes('priority');
  return hasQty && hasPrice;
}

function parseTable(rows: Record<string, any>[], currency: string): MatrixRow[] {
  const output: MatrixRow[] = [];
  for (const row of rows) {
    const qty = Number(read(row, ['qty', 'quantity']) || 0);
    const size = read(row, ['size', 'format']);
    const material = read(row, ['material', 'stock']);
    const finish = read(row, ['finish', 'finishing']);
    const sides = read(row, ['sides', 'printed_sides']);
    const turnaround = read(row, ['turnaround', 'delivery', 'service']) || 'standard';
    const price = read(row, ['price', 'price_minor']);

    if (price !== undefined && String(price).trim() !== '') {
      output.push({ qty, size, material, finish, sides, turnaround, priceMinor: moneyToMinor(price), currency, sourceFormat: 'table' });
      continue;
    }

    for (const service of ['standard', 'express', 'rush', 'priority']) {
      const servicePrice = read(row, [service, `${service}_price`, `${service}_delivery`]);
      if (servicePrice !== undefined && String(servicePrice).trim() !== '') {
        output.push({ qty, size, material, finish, sides, turnaround: service, priceMinor: moneyToMinor(servicePrice), currency, sourceFormat: 'table' });
      }
    }
  }
  return output.filter((row) => row.qty > 0 && row.priceMinor >= 0);
}

function parseGrid(rows: Record<string, any>[], currency: string): MatrixRow[] {
  const output: MatrixRow[] = [];
  for (const row of rows) {
    const qty = Number(read(row, ['qty', 'quantity']) || 0);
    if (!qty) continue;
    for (const [header, value] of Object.entries(row)) {
      const headerKey = key(header);
      if (headerKey === 'qty' || headerKey === 'quantity' || value === undefined || String(value).trim() === '') continue;
      const [material, finish, sides, turnaround, size] = String(header).split('|').map((part) => part.trim());
      output.push({
        qty,
        size,
        material,
        finish,
        sides,
        turnaround: turnaround || 'standard',
        priceMinor: moneyToMinor(value),
        currency,
        sourceFormat: 'grid',
      });
    }
  }
  return output.filter((row) => row.qty > 0 && row.priceMinor >= 0);
}

function normalise(payload: any): MatrixRecord {
  const productId = String(payload?.productId || 'default-product');
  const rows = rowsFromPayload(payload);
  const currency = String(payload?.currency || 'GBP');
  const detectedFormat: MatrixFormat = isTable(rows) ? 'table' : 'grid';
  return {
    productId,
    uploadedAt: new Date().toISOString(),
    detectedFormat,
    headers: Object.keys(rows[0] || {}),
    rows: detectedFormat === 'table' ? parseTable(rows, currency) : parseGrid(rows, currency),
  };
}

function resolve(record: MatrixRecord | undefined, query: URLSearchParams): MatrixRow | null {
  if (!record) return null;
  const qty = Number(query.get('qty') || 0);
  const wanted = {
    size: key(query.get('size')),
    material: key(query.get('material')),
    finish: key(query.get('finish')),
    sides: key(query.get('sides')),
    turnaround: key(query.get('turnaround') || 'standard'),
  };
  return record.rows.find((row) => {
    if (qty && row.qty !== qty) return false;
    if (wanted.size && key(row.size) !== wanted.size) return false;
    if (wanted.material && key(row.material) !== wanted.material) return false;
    if (wanted.finish && key(row.finish) !== wanted.finish) return false;
    if (wanted.sides && key(row.sides) !== wanted.sides) return false;
    if (wanted.turnaround && key(row.turnaround) !== wanted.turnaround) return false;
    return true;
  }) || null;
}

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId') || 'default-product';
  const matrix = matrixStore[productId] || null;
  return NextResponse.json({ ok: true, data: { matrix, resolvedPrice: resolve(matrix || undefined, req.nextUrl.searchParams) } });
}

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const record = normalise(payload);
  if (!record.rows.length) {
    return NextResponse.json({ ok: false, error: 'No matrix pricing rows could be normalised' }, { status: 400 });
  }
  matrixStore[record.productId] = record;
  return NextResponse.json({ ok: true, data: record });
}

export async function DELETE(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId') || 'default-product';
  delete matrixStore[productId];
  return NextResponse.json({ ok: true, data: { productId, removed: true } });
}
