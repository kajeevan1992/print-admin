import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { formatMinorPrice } from '@/core/storefront/native-pricing.service';
import { loadStorefrontCollectionPoints, type StorefrontCollectionPoint } from '@/core/storefront/collection-points.service';

const METHODS_RESOURCE = 'shipping-methods';
const RESERVATIONS_RESOURCE = 'storefront-fulfilment-reservations';
const DEFAULT_TIMEZONE = 'Europe/London';
const DEFAULT_RESERVATION_MINUTES = 45;

export type FulfilmentMode = 'delivery' | 'collection' | 'local-courier' | 'freight' | 'trade-drop-ship';
export type FulfilmentCapacityState = 'available' | 'limited' | 'full' | 'unlimited';

export type FulfilmentCollectionPointOption = {
  slug: string;
  name: string;
  address: string;
  note: string;
  eligible: boolean;
  reason: string;
  earliestDate: string;
  remainingCapacity: number | null;
  capacityState: FulfilmentCapacityState;
};

export type StorefrontFulfilmentOption = {
  id: string;
  name: string;
  publicLabel: string;
  description: string;
  mode: FulfilmentMode;
  carrier: string;
  serviceLevel: string;
  zoneName: string;
  priceMinor: number;
  formattedPrice: string;
  eligible: boolean;
  reason: string;
  requiresPostcode: boolean;
  requiresCollectionPoint: boolean;
  requiresManualApproval: boolean;
  taxClass: string;
  cutoffTime: string;
  cutoffPassed: boolean;
  dispatchDate: string;
  estimatedArrivalDate: string;
  remainingCapacity: number | null;
  capacityState: FulfilmentCapacityState;
  collectionPoints: FulfilmentCollectionPointOption[];
};

export type FulfilmentEvaluation = {
  tenantSlug: string;
  storeSlug: string;
  postcode: string;
  basketGrossMinor: number;
  basketWeightKg: number;
  options: StorefrontFulfilmentOption[];
  selected?: StorefrontFulfilmentOption | null;
  evaluatedAt: string;
};

type MethodRecord = {
  id: string;
  name: string;
  publicLabel: string;
  description: string;
  mode: FulfilmentMode;
  carrier: string;
  serviceLevel: string;
  status: string;
  risk: string;
  enabled: boolean;
  showAtCheckout: boolean;
  zoneType: string;
  zoneName: string;
  postcodeRules: string;
  postcodePriceBands: Array<{ rules: string; priceMinor: number; label?: string }>;
  pricingBasis: string;
  basePriceMinor: number;
  freeAboveMinor?: number;
  minSubtotalMinor?: number;
  maxSubtotalMinor?: number;
  maxWeightKg?: number;
  pricePerKgMinor?: number;
  productionBufferDays: number;
  sameDayEligible: boolean;
  nextDayEligible: boolean;
  requiresManualApproval: boolean;
  sortOrder: number;
  taxClass: string;
  cutoffTime: string;
  transitDays: string;
  timezone: string;
  workingDays: number[];
  blackoutDates: string[];
  dailyCapacity: number;
  reservationMinutes: number;
  collectionPointSlugs: string[];
  storeSlugs: string[];
  maxBasketLines?: number;
  maxItemCount?: number;
};

type Reservation = {
  id: string;
  methodId: string;
  serviceDate: string;
  collectionPointSlug: string;
  units: number;
  status: 'pending' | 'confirmed' | 'released';
  orderId: string;
  expiresAt: string;
};

type EvaluateInput = {
  tenantSlug: string;
  storeSlug: string;
  postcode?: string;
  collectionPointSlug?: string;
  selectedMethodId?: string;
  basketGrossMinor?: number;
  basketWeightKg?: number;
  basketLineCount?: number;
  basketItemCount?: number;
  now?: Date;
};

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function minor(value: unknown) { const next = Number(value || 0); return Number.isFinite(next) ? Math.max(0, Math.round(next)) : 0; }
function positive(value: unknown) { const next = Number(value || 0); return Number.isFinite(next) ? Math.max(0, next) : 0; }
function strings(value: unknown) { return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : []; }
function numbers(value: unknown, fallback: number[]) { const items = Array.isArray(value) ? value.map(Number).filter((item) => Number.isInteger(item) && item >= 0 && item <= 6) : []; return items.length ? [...new Set(items)] : fallback; }
function dateStrings(value: unknown) { return strings(value).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)); }
function postcode(value: unknown) { return clean(value).toUpperCase().replace(/\s+/g, ''); }
function outwardCode(value: string) { const match = postcode(value).match(/^([A-Z]{1,2}\d[A-Z\d]?)/); return match?.[1] || ''; }
function validUkPostcode(value: string) { return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(postcode(value)); }
function cutoffMinutes(value: string) { const match = clean(value).match(/^(\d{1,2}):(\d{2})$/); if (!match) return 24 * 60; return Math.min(24 * 60, Number(match[1]) * 60 + Number(match[2])); }
function transitMinimum(value: string) { const match = clean(value).match(/(\d+)/); return match ? Math.max(0, Number(match[1])) : 0; }

function normaliseMethod(row: any, index: number): MethodRecord {
  const meta = row?.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {};
  const mode = ['delivery', 'collection', 'local-courier', 'freight', 'trade-drop-ship'].includes(clean(meta.fulfilmentMode)) ? clean(meta.fulfilmentMode) as FulfilmentMode : 'delivery';
  const defaultDays = mode === 'collection' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  const bands = Array.isArray(meta.postcodePriceBands) ? meta.postcodePriceBands.map((band: any) => ({ rules: clean(band?.rules), priceMinor: minor(band?.priceMinor), label: clean(band?.label) })).filter((band: any) => band.rules) : [];
  return {
    id: clean(row?.id || row?.slug || `shipping-${index + 1}`),
    name: clean(row?.name || row?.title || `Shipping method ${index + 1}`),
    publicLabel: clean(meta.publicLabel || row?.name || row?.title || `Delivery option ${index + 1}`),
    description: clean(meta.checkoutDescription || row?.description || meta.notes),
    mode,
    carrier: clean(meta.carrier),
    serviceLevel: clean(meta.serviceLevel),
    status: clean(meta.status || 'active').toLowerCase(),
    risk: clean(meta.risk || 'healthy').toLowerCase(),
    enabled: meta.enabled !== false,
    showAtCheckout: meta.showAtCheckout !== false,
    zoneType: clean(meta.zoneType || (mode === 'collection' ? 'pickup' : 'uk-mainland')).toLowerCase(),
    zoneName: clean(meta.zoneName),
    postcodeRules: clean(meta.postcodeRules),
    postcodePriceBands: bands,
    pricingBasis: clean(meta.pricingBasis || 'flat').toLowerCase(),
    basePriceMinor: minor(meta.basePriceMinor ?? Math.round(Number(meta.surcharge || 0) * 100)),
    freeAboveMinor: meta.freeAboveMinor === undefined || meta.freeAboveMinor === null ? undefined : minor(meta.freeAboveMinor),
    minSubtotalMinor: meta.minSubtotalMinor === undefined || meta.minSubtotalMinor === null ? undefined : minor(meta.minSubtotalMinor),
    maxSubtotalMinor: meta.maxSubtotalMinor === undefined || meta.maxSubtotalMinor === null ? undefined : minor(meta.maxSubtotalMinor),
    maxWeightKg: meta.maxWeightKg === undefined || meta.maxWeightKg === null ? undefined : positive(meta.maxWeightKg),
    pricePerKgMinor: meta.pricePerKgMinor === undefined || meta.pricePerKgMinor === null ? undefined : minor(meta.pricePerKgMinor),
    productionBufferDays: Math.max(0, Math.round(Number(meta.productionBufferDays || 0))),
    sameDayEligible: meta.sameDayEligible === true,
    nextDayEligible: meta.nextDayEligible !== false,
    requiresManualApproval: meta.requiresManualApproval === true || clean(meta.pricingBasis) === 'manual-quote',
    sortOrder: Number(meta.sortOrder ?? index + 1),
    taxClass: clean(meta.taxClass || 'standard'),
    cutoffTime: clean(meta.cutoffTime || '16:00'),
    transitDays: clean(meta.transitDays),
    timezone: clean(meta.timezone || DEFAULT_TIMEZONE),
    workingDays: numbers(meta.workingDays, defaultDays),
    blackoutDates: dateStrings(meta.blackoutDates),
    dailyCapacity: Math.max(0, Math.round(Number(meta.dailyCapacity || 0))),
    reservationMinutes: Math.max(5, Math.round(Number(meta.reservationMinutes || DEFAULT_RESERVATION_MINUTES))),
    collectionPointSlugs: strings(meta.collectionPointSlugs).map(slug),
    storeSlugs: strings(meta.storeSlugs).map(slug),
    maxBasketLines: meta.maxBasketLines === undefined ? undefined : Math.max(0, Math.round(Number(meta.maxBasketLines || 0))),
    maxItemCount: meta.maxItemCount === undefined ? undefined : Math.max(0, Math.round(Number(meta.maxItemCount || 0))),
  };
}

async function resolveTenant(tenantSlug: string) {
  const key = slug(tenantSlug);
  const tenant = await platformPrisma.tenant.findFirst({ where: { OR: [{ id: key }, { slug: key }, { defaultSubdomain: key }] }, select: { id: true, slug: true, defaultSubdomain: true } });
  if (!tenant) throw new Error('Storefront tenant was not found for fulfilment evaluation.');
  return tenant;
}

async function loadMethods(tenantId: string, storeSlug: string) {
  const rows = await platformPrisma.coreCatalogRecord.findMany({ where: { tenantId, resource: METHODS_RESOURCE }, orderBy: { updatedAt: 'desc' }, take: 200 });
  return rows.map(normaliseMethod).filter((method) => !method.storeSlugs.length || method.storeSlugs.includes(slug(storeSlug))).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(read('weekday'));
  const hour = Number(read('hour')) % 24;
  return { date: `${read('year')}-${read('month')}-${read('day')}`, weekday: Math.max(0, weekday), minutes: hour * 60 + Number(read('minute') || 0) };
}

function dayDate(value: string) { return new Date(`${value}T12:00:00.000Z`); }
function isoDay(date: Date) { return date.toISOString().slice(0, 10); }
function nextDay(value: string) { const date = dayDate(value); date.setUTCDate(date.getUTCDate() + 1); return isoDay(date); }
function weekday(value: string) { return dayDate(value).getUTCDay(); }
function working(value: string, days: number[], blackout: string[]) { return days.includes(weekday(value)) && !blackout.includes(value); }
function nextWorking(value: string, days: number[], blackout: string[], includeCurrent: boolean) { let cursor = includeCurrent ? value : nextDay(value); for (let index = 0; index < 370; index += 1) { if (working(cursor, days, blackout)) return cursor; cursor = nextDay(cursor); } return value; }
function addWorking(value: string, count: number, days: number[], blackout: string[]) { let cursor = value; for (let index = 0; index < count; index += 1) cursor = nextWorking(cursor, days, blackout, false); return cursor; }

function ruleTokens(value: string) {
  return clean(value).toUpperCase().split(/[\n,;]+/).map((item) => item.trim()).filter((item) => /^!?[A-Z]{1,2}\d?[A-Z\d]?\*?$/.test(item));
}

function tokenMatch(code: string, full: string, token: string) {
  const raw = token.replace(/^!/, '');
  if (raw.endsWith('*')) return code.startsWith(raw.slice(0, -1)) || full.startsWith(raw.slice(0, -1));
  return code === raw || full === raw || full.startsWith(raw);
}

function postcodeMatch(method: MethodRecord, value: string) {
  if (method.zoneType === 'pickup' || method.mode === 'collection') return { eligible: true, reason: '' };
  if (method.zoneType === 'manual') return { eligible: false, reason: 'This route requires a manual delivery quotation.' };
  const full = postcode(value);
  if (!full) return { eligible: false, reason: 'Enter a delivery postcode to check availability.' };
  if (!validUkPostcode(full)) return { eligible: false, reason: 'Enter a valid UK postcode.' };
  const code = outwardCode(full);
  const tokens = ruleTokens(method.postcodeRules);
  const negative = tokens.filter((item) => item.startsWith('!'));
  if (negative.some((item) => tokenMatch(code, full, item))) return { eligible: false, reason: 'This postcode is excluded from the selected delivery zone.' };
  const positive = tokens.filter((item) => !item.startsWith('!'));
  if (method.zoneType === 'uk-mainland') {
    if (['BT', 'IM', 'JE', 'GY'].some((prefix) => code.startsWith(prefix))) return { eligible: false, reason: 'This method is limited to UK mainland postcodes.' };
    if (positive.length && !positive.some((item) => tokenMatch(code, full, item))) return { eligible: false, reason: 'This postcode is outside the configured delivery zone.' };
    return { eligible: true, reason: '' };
  }
  if (!positive.length) return { eligible: false, reason: 'This delivery method has no machine-readable postcode rules.' };
  return positive.some((item) => tokenMatch(code, full, item)) ? { eligible: true, reason: '' } : { eligible: false, reason: 'This postcode is outside the configured delivery zone.' };
}

function priceFor(method: MethodRecord, input: EvaluateInput) {
  if (method.pricingBasis === 'manual-quote') return method.basePriceMinor;
  if (method.pricingBasis === 'free-over-threshold' && method.freeAboveMinor !== undefined && minor(input.basketGrossMinor) >= method.freeAboveMinor) return 0;
  if (method.pricingBasis === 'weight' && method.pricePerKgMinor) return method.basePriceMinor + Math.ceil(positive(input.basketWeightKg)) * method.pricePerKgMinor;
  if (method.pricingBasis === 'postcode') {
    const full = postcode(input.postcode);
    const code = outwardCode(full);
    const band = method.postcodePriceBands.find((item) => ruleTokens(item.rules).some((token) => tokenMatch(code, full, token)));
    if (band) return band.priceMinor;
  }
  return method.basePriceMinor;
}

function capacityState(capacity: number, remaining: number | null): FulfilmentCapacityState {
  if (!capacity) return 'unlimited';
  if (!remaining || remaining <= 0) return 'full';
  return remaining <= Math.max(1, Math.ceil(capacity * 0.2)) ? 'limited' : 'available';
}

async function loadReservations(tenantId: string) {
  const rows = await platformPrisma.coreCatalogRecord.findMany({ where: { tenantId, resource: RESERVATIONS_RESOURCE }, orderBy: { updatedAt: 'desc' }, take: 2000 });
  const now = Date.now();
  return rows.map((row) => {
    const meta = row.metadataJson as any;
    return { id: row.id, methodId: clean(meta?.methodId), serviceDate: clean(meta?.serviceDate), collectionPointSlug: slug(meta?.collectionPointSlug), units: Math.max(1, Math.round(Number(meta?.units || 1))), status: ['pending', 'confirmed', 'released'].includes(clean(meta?.status)) ? clean(meta?.status) as Reservation['status'] : 'released', orderId: clean(meta?.orderId), expiresAt: clean(meta?.expiresAt) } satisfies Reservation;
  }).filter((item) => item.status === 'confirmed' || (item.status === 'pending' && new Date(item.expiresAt).getTime() > now));
}

function reservedUnits(reservations: Reservation[], methodId: string, serviceDate: string, collectionPointSlug = '') {
  return reservations.filter((item) => item.methodId === methodId && item.serviceDate === serviceDate && (!collectionPointSlug || item.collectionPointSlug === collectionPointSlug)).reduce((sum, item) => sum + item.units, 0);
}

function methodDates(method: MethodRecord, now: Date, point?: StorefrontCollectionPoint | null) {
  const parts = zonedParts(now, method.timezone);
  const days = point ? method.workingDays.filter((day) => point.workingDays.includes(day)) : method.workingDays;
  const blackout = [...new Set([...method.blackoutDates, ...(point?.blackoutDates || [])])];
  const activeDays = days.length ? days : method.workingDays;
  const cutoff = cutoffMinutes(point?.cutoffTime || method.cutoffTime);
  const cutoffPassed = !working(parts.date, activeDays, blackout) || parts.minutes >= cutoff;
  let dispatchDate = nextWorking(parts.date, activeDays, blackout, !cutoffPassed);
  dispatchDate = addWorking(dispatchDate, method.productionBufferDays, activeDays, blackout);
  if (!method.sameDayEligible && method.nextDayEligible && dispatchDate === parts.date) dispatchDate = nextWorking(dispatchDate, activeDays, blackout, false);
  const arrival = addWorking(dispatchDate, method.mode === 'collection' || method.sameDayEligible ? 0 : transitMinimum(method.transitDays), activeDays, blackout);
  return { cutoffPassed, dispatchDate, arrivalDate: arrival };
}

function genericReason(method: MethodRecord, input: EvaluateInput) {
  if (!method.enabled || !method.showAtCheckout || method.status === 'paused') return 'This method is not enabled at checkout.';
  if (method.risk === 'critical') return 'This route is temporarily unavailable because it is marked critical.';
  const gross = minor(input.basketGrossMinor);
  if (method.minSubtotalMinor !== undefined && gross < method.minSubtotalMinor) return `Basket total must be at least ${formatMinorPrice(method.minSubtotalMinor, 'GBP')}.`;
  if (method.maxSubtotalMinor !== undefined && gross > method.maxSubtotalMinor) return `Basket total exceeds the limit for this method.`;
  if (method.maxWeightKg !== undefined && positive(input.basketWeightKg) > method.maxWeightKg) return `Basket weight exceeds ${method.maxWeightKg} kg for this method.`;
  if (method.maxBasketLines !== undefined && Number(input.basketLineCount || 0) > method.maxBasketLines) return `This method supports up to ${method.maxBasketLines} basket lines.`;
  if (method.maxItemCount !== undefined && Number(input.basketItemCount || 0) > method.maxItemCount) return `This method supports up to ${method.maxItemCount} items.`;
  return '';
}

export async function evaluateStorefrontFulfilment(input: EvaluateInput): Promise<FulfilmentEvaluation> {
  const tenant = await resolveTenant(input.tenantSlug);
  const methods = await loadMethods(tenant.id, input.storeSlug);
  const points = await loadStorefrontCollectionPoints([tenant.id, tenant.slug, tenant.defaultSubdomain]);
  const reservations = await loadReservations(tenant.id);
  const now = input.now || new Date();
  const options: StorefrontFulfilmentOption[] = [];

  for (const method of methods) {
    const baseReason = genericReason(method, input);
    const postcodeResult = postcodeMatch(method, clean(input.postcode));
    const relevantPoints = method.mode === 'collection' ? points.filter((point) => point.enabled && (!method.collectionPointSlugs.length || method.collectionPointSlugs.includes(point.slug))) : [];
    const pointOptions: FulfilmentCollectionPointOption[] = relevantPoints.map((point) => {
      const dates = methodDates(method, now, point);
      const methodRemaining = method.dailyCapacity ? Math.max(0, method.dailyCapacity - reservedUnits(reservations, method.id, dates.dispatchDate)) : null;
      const pointRemaining = point.dailyCapacity ? Math.max(0, point.dailyCapacity - reservedUnits(reservations, method.id, dates.dispatchDate, point.slug)) : null;
      const remaining = methodRemaining === null ? pointRemaining : pointRemaining === null ? methodRemaining : Math.min(methodRemaining, pointRemaining);
      const full = remaining !== null && remaining <= 0;
      return { slug: point.slug, name: point.name, address: point.address, note: point.note, eligible: !full, reason: full ? 'This collection point has reached its capacity for the next available date.' : '', earliestDate: dates.dispatchDate, remainingCapacity: remaining, capacityState: capacityState(Math.max(method.dailyCapacity, point.dailyCapacity), remaining) };
    });
    const selectedPoint = method.mode === 'collection' ? pointOptions.find((point) => point.slug === slug(input.collectionPointSlug)) || null : null;
    const dates = methodDates(method, now, method.mode === 'collection' ? relevantPoints.find((point) => point.slug === selectedPoint?.slug) || null : null);
    const remaining = method.dailyCapacity ? Math.max(0, method.dailyCapacity - reservedUnits(reservations, method.id, dates.dispatchDate)) : null;
    let reason = baseReason;
    if (!reason && method.mode !== 'collection' && !postcodeResult.eligible) reason = postcodeResult.reason;
    if (!reason && method.mode === 'collection' && !pointOptions.length) reason = 'No collection point is currently available for this method.';
    if (!reason && method.mode === 'collection' && input.collectionPointSlug && !selectedPoint) reason = 'The selected collection point is not available for this method.';
    if (!reason && selectedPoint && !selectedPoint.eligible) reason = selectedPoint.reason;
    if (!reason && remaining !== null && remaining <= 0) reason = 'This method has reached its daily capacity for the next available date.';
    if (!reason && method.requiresManualApproval) reason = 'This method requires manual approval before payment.';
    const priceMinor = priceFor(method, input);
    options.push({
      id: method.id,
      name: method.name,
      publicLabel: method.publicLabel,
      description: method.description,
      mode: method.mode,
      carrier: method.carrier,
      serviceLevel: method.serviceLevel,
      zoneName: method.zoneName,
      priceMinor,
      formattedPrice: priceMinor ? formatMinorPrice(priceMinor, 'GBP') : 'Free',
      eligible: !reason,
      reason,
      requiresPostcode: method.mode !== 'collection' && method.zoneType !== 'manual',
      requiresCollectionPoint: method.mode === 'collection',
      requiresManualApproval: method.requiresManualApproval,
      taxClass: method.taxClass,
      cutoffTime: method.cutoffTime,
      cutoffPassed: dates.cutoffPassed,
      dispatchDate: selectedPoint?.earliestDate || dates.dispatchDate,
      estimatedArrivalDate: method.mode === 'collection' ? selectedPoint?.earliestDate || dates.dispatchDate : dates.arrivalDate,
      remainingCapacity: selectedPoint?.remainingCapacity ?? remaining,
      capacityState: selectedPoint?.capacityState || capacityState(method.dailyCapacity, remaining),
      collectionPoints: pointOptions,
    });
  }

  return { tenantSlug: slug(input.tenantSlug), storeSlug: slug(input.storeSlug), postcode: postcode(input.postcode), basketGrossMinor: minor(input.basketGrossMinor), basketWeightKg: positive(input.basketWeightKg), options, selected: options.find((option) => option.id === clean(input.selectedMethodId)) || null, evaluatedAt: new Date().toISOString() };
}

export async function requireEligibleFulfilment(input: EvaluateInput & { selectedMethodId: string }) {
  const evaluation = await evaluateStorefrontFulfilment(input);
  const selected = evaluation.options.find((option) => option.id === clean(input.selectedMethodId));
  if (!selected) throw new Error('The selected fulfilment method no longer exists.');
  if (!selected.eligible) throw new Error(selected.reason || 'The selected fulfilment method is not available.');
  if (selected.requiresCollectionPoint && !slug(input.collectionPointSlug)) throw new Error('Choose a collection point.');
  return { evaluation, selected };
}

async function updateReservation(tenantId: string, orderId: string, status: Reservation['status']) {
  const rows = await platformPrisma.coreCatalogRecord.findMany({ where: { tenantId, resource: RESERVATIONS_RESOURCE }, take: 1000 });
  const matches = rows.filter((row) => clean((row.metadataJson as any)?.orderId) === clean(orderId));
  for (const row of matches) {
    const meta = row.metadataJson as any;
    await platformPrisma.coreCatalogRecord.update({ where: { id: row.id }, data: { metadataJson: { ...meta, status, updatedAt: new Date().toISOString() } } });
  }
  return matches.length;
}

export async function reserveFulfilmentCapacity(input: EvaluateInput & { selectedMethodId: string; orderId: string }) {
  const tenant = await resolveTenant(input.tenantSlug);
  const { selected } = await requireEligibleFulfilment(input);
  const reservationId = `fulfilment-${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + DEFAULT_RESERVATION_MINUTES * 60 * 1000).toISOString();
  await platformPrisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `${tenant.id}:${selected.id}:${selected.dispatchDate}:${slug(input.collectionPointSlug)}`);
    const rows = await tx.coreCatalogRecord.findMany({ where: { tenantId: tenant.id, resource: RESERVATIONS_RESOURCE }, take: 2000 });
    const active = rows.map((row: any) => row.metadataJson as any).filter((meta: any) => clean(meta?.methodId) === selected.id && clean(meta?.serviceDate) === selected.dispatchDate && (!input.collectionPointSlug || slug(meta?.collectionPointSlug) === slug(input.collectionPointSlug)) && (clean(meta?.status) === 'confirmed' || (clean(meta?.status) === 'pending' && new Date(clean(meta?.expiresAt)).getTime() > Date.now())));
    const methodRow = await tx.coreCatalogRecord.findFirst({ where: { tenantId: tenant.id, resource: METHODS_RESOURCE, id: selected.id } });
    const method = methodRow ? normaliseMethod(methodRow, 0) : null;
    if (method?.dailyCapacity && active.reduce((sum: number, meta: any) => sum + Math.max(1, Number(meta?.units || 1)), 0) >= method.dailyCapacity) throw new Error('This fulfilment method reached capacity while checkout was being prepared. Choose another option.');
    await tx.coreCatalogRecord.create({ data: { id: reservationId, tenantId: tenant.id, resource: RESERVATIONS_RESOURCE, slug: reservationId, name: `Fulfilment reservation ${input.orderId}`, description: `${selected.publicLabel} for ${selected.dispatchDate}`, metadataJson: { orderId: clean(input.orderId), methodId: selected.id, methodLabel: selected.publicLabel, serviceDate: selected.dispatchDate, estimatedArrivalDate: selected.estimatedArrivalDate, collectionPointSlug: slug(input.collectionPointSlug), units: 1, status: 'pending', expiresAt, priceMinor: selected.priceMinor, taxClass: selected.taxClass, tenantSlug: slug(input.tenantSlug), storeSlug: slug(input.storeSlug), createdAt: new Date().toISOString() } } });
  });
  return { reservationId, expiresAt, method: selected };
}

export async function confirmFulfilmentReservation(tenantSlug: string, orderId: string) { const tenant = await resolveTenant(tenantSlug); return updateReservation(tenant.id, orderId, 'confirmed'); }
export async function releaseFulfilmentReservation(tenantSlug: string, orderId: string) { const tenant = await resolveTenant(tenantSlug); return updateReservation(tenant.id, orderId, 'released'); }

export async function syncFulfilmentReservationForPayment(order: any) {
  const resolver = order?.resolver || {};
  const tenantSlug = clean(resolver.tenantSlug);
  const orderId = clean(order?.id);
  if (!tenantSlug || !orderId) return { updated: 0, skipped: true };
  const status = clean(order?.paymentStatus).toLowerCase();
  if (['paid', 'captured', 'authorized'].includes(status)) return { updated: await confirmFulfilmentReservation(tenantSlug, orderId), status: 'confirmed' };
  if (['failed', 'expired', 'cancelled', 'refunded'].includes(status)) return { updated: await releaseFulfilmentReservation(tenantSlug, orderId), status: 'released' };
  return { updated: 0, skipped: true, status };
}
