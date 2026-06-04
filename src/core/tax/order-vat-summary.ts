export type OrderVatBreakdownRow = {
  rate: number;
  vatClass: string;
  netMinor: number;
  vatMinor: number;
  grossMinor: number;
  reasons: string[];
};

export type OrderVatSummary = {
  currency: string;
  netMinor: number;
  vatMinor: number;
  deliveryMinor: number;
  grossMinor: number;
  itemGrossMinor: number;
  itemVatMinor: number;
  deliveryNetMinor: number;
  deliveryVatMinor: number;
  net: number;
  vat: number;
  delivery: number;
  gross: number;
  vatBreakdown: OrderVatBreakdownRow[];
  taxEnforcedAt: string;
  isMixedVat: boolean;
  hasVatBreakdown: boolean;
};

function minor(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) && next >= 0 ? Math.round(next) : 0;
}

function moneyToMinor(value: unknown) {
  const next = Number(value || 0);
  if (!Number.isFinite(next) || next < 0) return 0;
  return next > 10000 ? Math.round(next) : Math.round(next * 100);
}

function minorToMoney(value: unknown) {
  return Math.round((Number(value || 0) / 100) * 100) / 100;
}

function safeRate(value: unknown, fallback = 20) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : fallback;
}

function vatClassFromRate(rate: number, explicit?: unknown) {
  const text = String(explicit || '').toLowerCase();
  if (text) return text;
  if (rate === 0) return 'zero';
  if (rate === 20) return 'standard';
  return 'custom';
}

function parseNotes(value: unknown) {
  if (!value || typeof value !== 'string') return {} as Record<string, any>;
  try { return JSON.parse(value); } catch { return {}; }
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function normaliseBreakdownRow(row: any): OrderVatBreakdownRow | null {
  if (!row || typeof row !== 'object') return null;
  const rate = safeRate(row.rate ?? row.vatRate ?? row.taxRate, 20);
  const netMinor = minor(row.netMinor ?? row.netTotalMinor ?? row.netAmountMinor) || moneyToMinor(row.net ?? row.netTotal ?? row.netAmount);
  const vatMinor = minor(row.vatMinor ?? row.vatTotalMinor ?? row.taxMinor) || moneyToMinor(row.vat ?? row.vatTotal ?? row.tax);
  const grossMinor = minor(row.grossMinor ?? row.grossTotalMinor ?? row.totalMinor) || moneyToMinor(row.gross ?? row.grossTotal ?? row.total) || netMinor + vatMinor;
  if (!netMinor && !vatMinor && !grossMinor) return null;
  return {
    rate,
    vatClass: vatClassFromRate(rate, row.vatClass ?? row.taxClass),
    netMinor,
    vatMinor,
    grossMinor,
    reasons: Array.isArray(row.reasons) ? row.reasons.map(String) : row.reason ? [String(row.reason)] : [],
  };
}

function itemQuantity(item: any) {
  const quantity = Number(item?.quantity ?? item?.qty ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1;
}

function itemGrossMinor(item: any) {
  const meta = item?.metadataJson || item?.metadata || {};
  return minor(item?.totalPriceMinor ?? item?.grossTotalMinor ?? meta.grossTotalMinor ?? meta.totalPriceMinor ?? meta.lineTotalMinor)
    || moneyToMinor(item?.totalPrice ?? item?.grossTotal ?? item?.lineTotal ?? item?.total)
    || moneyToMinor(item?.price ?? item?.unitPrice) * itemQuantity(item);
}

function itemNetMinor(item: any) {
  const meta = item?.metadataJson || item?.metadata || {};
  const direct = minor(item?.netTotalMinor ?? meta.netTotalMinor);
  if (direct) return direct;
  const gross = itemGrossMinor(item);
  const rate = safeRate(item?.vatRate ?? item?.taxRate ?? meta.vatRate ?? meta.taxRate ?? (itemVatMinor(item) ? 20 : 0), 20);
  return rate ? Math.round(gross / (1 + rate / 100)) : gross;
}

function itemVatMinor(item: any) {
  const meta = item?.metadataJson || item?.metadata || {};
  const direct = minor(item?.vatMinor ?? item?.vatTotalMinor ?? meta.vatMinor ?? meta.vatTotalMinor ?? meta.taxMinor);
  if (direct) return direct;
  return Math.max(0, itemGrossMinor(item) - itemNetMinor(item));
}

function addBucket(map: Map<number, OrderVatBreakdownRow>, rateInput: unknown, netMinorInput: number, vatMinorInput: number, grossMinorInput: number, vatClassInput?: unknown, reason?: unknown) {
  const rate = safeRate(rateInput, vatMinorInput ? 20 : 0);
  const current = map.get(rate) || { rate, vatClass: vatClassFromRate(rate, vatClassInput), netMinor: 0, vatMinor: 0, grossMinor: 0, reasons: [] as string[] };
  current.netMinor += minor(netMinorInput);
  current.vatMinor += minor(vatMinorInput);
  current.grossMinor += minor(grossMinorInput);
  const note = String(reason || '').trim();
  if (note && !current.reasons.includes(note)) current.reasons.push(note);
  map.set(rate, current);
}

function deriveBreakdown(order: Record<string, any>, notes: Record<string, any>) {
  const buckets = new Map<number, OrderVatBreakdownRow>();
  for (const item of asArray(order.items)) {
    const meta = item?.metadataJson || item?.metadata || {};
    const gross = itemGrossMinor(item);
    const net = itemNetMinor(item);
    const vat = itemVatMinor(item);
    const rate = safeRate(item?.vatRate ?? item?.taxRate ?? meta.vatRate ?? meta.taxRate ?? (vat ? 20 : 0), vat ? 20 : 0);
    addBucket(buckets, rate, net, vat, gross, item?.vatClass ?? meta.vatClass ?? meta.taxClass, item?.vatReason ?? meta.vatReason ?? meta.taxReason ?? 'order-line-vat-metadata');
  }

  if (!buckets.size) {
    const gross = minor(order.totalMinor) || moneyToMinor(order.total);
    const vat = minor(order.taxMinor ?? notes.totals?.taxMinor ?? notes.vatTotalMinor);
    const net = minor(order.subtotalMinor ?? notes.totals?.subtotalMinor) || Math.max(0, gross - vat);
    addBucket(buckets, vat ? 20 : 0, net, vat, gross, vat ? 'standard' : 'zero', 'order-total-fallback');
  }

  return [...buckets.values()].sort((a, b) => a.rate - b.rate);
}

export function buildOrderVatSummary(order: Record<string, any> = {}): OrderVatSummary {
  const notes = parseNotes(order.notes);
  const existingTax = order.taxSummary || order.tax_summary || notes.taxSummary || notes.tax_summary || {};
  const totals = order.totals || notes.totals || {};
  const rawBreakdown = asArray(existingTax.vatBreakdown || existingTax.breakdown || order.vatBreakdown || order.vat_breakdown || totals.vatBreakdown || notes.vatBreakdown);
  const existingBreakdown = rawBreakdown.map(normaliseBreakdownRow).filter(Boolean) as OrderVatBreakdownRow[];
  const vatBreakdown = existingBreakdown.length ? existingBreakdown : deriveBreakdown(order, notes);

  const breakdownNetMinor = vatBreakdown.reduce((sum, row) => sum + minor(row.netMinor), 0);
  const breakdownVatMinor = vatBreakdown.reduce((sum, row) => sum + minor(row.vatMinor), 0);
  const breakdownGrossMinor = vatBreakdown.reduce((sum, row) => sum + minor(row.grossMinor), 0);
  const itemGrossMinor = asArray(order.items).reduce((sum, item) => sum + itemGrossMinor(item), 0);
  const itemVatMinor = asArray(order.items).reduce((sum, item) => sum + itemVatMinor(item), 0);
  const deliveryMinor = minor(existingTax.deliveryMinor ?? totals.deliveryMinor ?? order.shippingMinor ?? order.deliveryMinor) || moneyToMinor(existingTax.delivery ?? totals.delivery ?? order.shipping ?? order.deliveryFee);
  const deliveryVatMinor = minor(existingTax.deliveryVatMinor ?? totals.deliveryVatMinor);
  const deliveryNetMinor = minor(existingTax.deliveryNetMinor ?? totals.deliveryNetMinor) || Math.max(0, deliveryMinor - deliveryVatMinor);

  const grossMinor = minor(existingTax.grossMinor ?? existingTax.totalMinor ?? totals.grossTotalMinor ?? totals.totalMinor ?? order.totalMinor) || moneyToMinor(existingTax.gross ?? existingTax.total ?? totals.total ?? order.total) || breakdownGrossMinor;
  const vatMinor = minor(existingTax.vatMinor ?? existingTax.taxMinor ?? totals.vatTotalMinor ?? totals.taxMinor ?? order.taxMinor) || moneyToMinor(existingTax.vat ?? existingTax.tax ?? totals.vat ?? totals.tax) || breakdownVatMinor;
  const netMinor = minor(existingTax.netMinor ?? existingTax.subtotalMinor ?? totals.netTotalMinor ?? totals.subtotalMinor ?? order.subtotalMinor) || moneyToMinor(existingTax.net ?? existingTax.subtotal ?? totals.subtotal ?? order.subtotal) || breakdownNetMinor || Math.max(0, grossMinor - vatMinor);

  return {
    currency: String(order.currency || totals.currency || existingTax.currency || 'GBP'),
    netMinor,
    vatMinor,
    deliveryMinor,
    grossMinor,
    itemGrossMinor: itemGrossMinor || Math.max(0, grossMinor - deliveryMinor),
    itemVatMinor: itemVatMinor || Math.max(0, vatMinor - deliveryVatMinor),
    deliveryNetMinor,
    deliveryVatMinor,
    net: minorToMoney(netMinor),
    vat: minorToMoney(vatMinor),
    delivery: minorToMoney(deliveryMinor),
    gross: minorToMoney(grossMinor),
    vatBreakdown,
    taxEnforcedAt: String(existingTax.taxEnforcedAt || order.taxEnforcedAt || notes.taxEnforcedAt || ''),
    isMixedVat: vatBreakdown.length > 1,
    hasVatBreakdown: vatBreakdown.length > 0,
  };
}

export function withOrderVatSummary<T extends Record<string, any>>(order: T): T & { taxSummary: OrderVatSummary; vatBreakdown: OrderVatBreakdownRow[]; taxEnforcedAt: string; total: number } {
  const taxSummary = buildOrderVatSummary(order);
  return {
    ...order,
    total: taxSummary.gross,
    vatBreakdown: taxSummary.vatBreakdown,
    taxEnforcedAt: taxSummary.taxEnforcedAt,
    taxSummary,
  };
}
