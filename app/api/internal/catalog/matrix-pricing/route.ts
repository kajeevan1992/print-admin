import { NextRequest, NextResponse } from 'next/server';

type MatrixRow = {
  qty: number;
  size?: string;
  material?: string;
  finish?: string;
  sides?: string;
  turnaround?: string;
  priceMinor: number;
  currency: string;
  sourceFormat: 'table' | 'grid';
  raw?: Record<string, any>;
};

type MatrixRecord = {
  productId: string;
  uploadedAt: string;
  detectedFormat: 'table' | 'grid';
  rows: MatrixRow[];
  headers: string[];
};

const store = new Map<string, MatrixRecord>();

function normaliseKey(value: any) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
}

function moneyToMinor(value: any) {
  if (typeof value === 'number') return Math.round(value * 100);
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned || 0);
  return Math.round(parsed * 100);
}

function toRows(input: any): Record<string, any>[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.rows)) return input.rows;
  if (typeof input?.csv === 'string') {
    const lines = input.csv.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
    const headers = String(lines.shift() || '').split(',').map((h) => h.trim());
    return lines.map((line: string) => {
      const values = line.split(',').map((v) => v.trim());
      return headers.reduce((row: Record<string, any>, header, index) => {
        row[header] = values[index] ?? '';
        return row;
      }, {});
    });
  }
  return [];
}

function detectTable(rows: Record<string, any>[]) {
  const keys = Object.keys(rows[0] || {}).map(normaliseKey);
  return keys.includes('qty') || keys.includes('quantity')
    ? keys.includes('price') || keys.includes('price_minor') || keys.includes('standard') || keys.includes('express') || keys.includes('rush')
    : false;
}

function getValue(row: Record<string, any>, names: string[]) {
  const found = Object.keys(row).find((key) => names.includes(normaliseKey(key)));
  return found ? row[found] : undefined;
}

function parseTable(rows: Record<string, any>[], currency = 'GBP'): MatrixRow[] {
  const output: MatrixRow[] = [];
  rows.forEach((row) => {
    const qty = Number(getValue(row, ['qty', 'quantity']) || 0);
    const size = getValue(row, ['size', 'format']);
    const material = getValue(row, ['material', 'stock']);
    const finish = getValue(row, ['finish', 'finishing']);
    const sides = getValue(row, ['sides', 'printed_sides']);
    const explicitTurnaround = getValue(row, ['turnaround', 'delivery', 'service']);
    const explicitPrice = getValue(row, ['price', 'price_minor']);

    if (explicitPrice !== undefined) {
      output.push({ qty, size, material, finish, sides, turnaround: explicitTurnaround || 'standard', priceMinor: moneyToMinor(explicitPrice), currency, sourceFormat: 'table', raw: row });
      return;
    }

    ['standard', 'express', 'rush', 'priority'].forEach((turnaround) => {
      const value = getValue(row, [turnaround, `${turnaround}_price`, `${turnaround}_delivery`]);
      if (value !== undefined && String(value).trim() !== '') {
        output.push({ qty, size, material, finish, sides, turnaround, priceMinor: moneyToMinor(value), currency, sourceFormat: 'table', raw: row });
      }
    });
  });
  return output.filter((row) => row.qty > 0 && row.priceMinor >= 0);
}

function parseGrid(rows: Record<string, any>[], currency = 'GBP'): MatrixRow[] {
  const output: MatrixRow[] = [];
  rows.forEach((row) => {
    const qty = Number(getValue(row, ['qty', 'quantity']) || 0);
    if (!qty) return;
    Object.entries(row).forEach(([header, value]) => {
      const key = normaliseKey(header);
      if (['qty', 'quantity'].includes(key) || value === undefined || value === '') return;
      const parts = String(header).split('|').map((part) => part.trim());
      const [material, finish, sides, turnaround, size] = parts;
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
        raw: row,
      });
    });
  });
  return output.filter((row) => row.qty > 0 && row.priceMinor >= 0);
}

function normaliseMatrix(payload: any): MatrixRecord {
  const productId = String(payload?.productId || 'default-product');
  const rows = toRows(payload?.data ?? payload);
  const detectedFormat = detectTable(rows) ? 'table' : 'grid';
  const currency = String(payload?.currency || 'GBP');
  const normalisedRows = detectedFormat === 'table' ? parseTable(rows, currency) : parseGrid(rows, currency);
  return {
    productId,
    uploadedAt: new Date().toISOString(),
    detectedFormat,
    rows: normalisedRows,
    headers: Object.keys(rows[0] || {}),
  };
}

function resolvePrice(record: MatrixRecord | undefined, query: URLSearchParams) {
  if (!record) return null;
  const qty = Number(query.get('qty') || 0);
  const wanted = {
    size: normaliseKey(query.get('size')),
    material: normaliseKey(query.get('material')),
    finish: normaliseKey(query.get('finish')),
    sides: normaliseKey(query.get('sides')),
    turnaround: normaliseKey(query.get('turnaround') || 'standard'),
  };
  return record.rows.find((row) => {
    if (qty && row.qty !== qty) return false;
    if (wanted.size && normaliseKey(row.size) !== wanted.size) return false;
    if (wanted.material && normaliseKey(row.material) !== wanted.material) return false;
    if (wanted.finish && normaliseKey(row.finish) !== wanted.finish) return false;
    if (wanted.sides && normaliseKey(row.sides) !== wanted.sides) return false;
    if (wanted.turnaround && normaliseKey(row.turnaround) !== wanted.turnaround) return false;
    return true;
  }) || null;
}

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId') || 'default-product';
  const record = store.get(productId) || null;
  const price = resolvePrice(record || undefined, req.nextUrl.searchParams);
  return NextResponse.json({ ok: true, data: { matrix: record, resolvedPrice: price } });
}

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const record = normaliseMatrix(payload);
  if (!record.productId) return NextResponse.json({ ok: false, error: 'productId is required' }, { status: 400 });
  if (!record.rows.length) return NextResponse.json({ ok: false, error: 'No matrix pricing rows could be normalised' }, { status: 400 });
  store.set(record.productId, record);
  return NextResponse.json({ ok: true, data: record });
}

export async function DELETE(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId') || 'default-product';
  store.delete(productId);
  return NextResponse.json({ ok: true, data: { productId, removed: true } });
}
