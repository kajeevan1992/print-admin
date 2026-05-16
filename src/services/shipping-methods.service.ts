import { shippingMethodRecordsMock, type ShippingMethodRecord } from '@/data/shipping-methods';

const KEY = 'admin_shipping_methods_store';
const LIVE_ENDPOINT = '/api/internal/catalog/shipping-methods';

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function slugify(value: string, fallback: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}

function normaliseMethod(record: Partial<ShippingMethodRecord>, index = 0): ShippingMethodRecord {
  const fallback = shippingMethodRecordsMock[index] || shippingMethodRecordsMock[0];
  return {
    ...fallback,
    ...record,
    id: String(record.id || fallback?.id || `delivery-${Date.now()}-${index}`),
    name: String(record.name || fallback?.name || `Delivery method ${index + 1}`),
    publicLabel: String(record.publicLabel || record.name || fallback?.publicLabel || fallback?.name || `Delivery method ${index + 1}`),
    checkoutDescription: String(record.checkoutDescription || record.notes || fallback?.checkoutDescription || ''),
    eligiblePlants: Array.isArray(record.eligiblePlants) ? record.eligiblePlants.map(String) : fallback?.eligiblePlants || [],
    surcharge: Number(record.surcharge ?? fallback?.surcharge ?? 0),
    basePriceMinor: Number(record.basePriceMinor ?? Math.round(Number(record.surcharge ?? fallback?.surcharge ?? 0) * 100)),
    freeAboveMinor: record.freeAboveMinor === undefined || record.freeAboveMinor === null ? undefined : Number(record.freeAboveMinor),
    minSubtotalMinor: record.minSubtotalMinor === undefined || record.minSubtotalMinor === null ? undefined : Number(record.minSubtotalMinor),
    maxSubtotalMinor: record.maxSubtotalMinor === undefined || record.maxSubtotalMinor === null ? undefined : Number(record.maxSubtotalMinor),
    maxWeightKg: record.maxWeightKg === undefined || record.maxWeightKg === null ? undefined : Number(record.maxWeightKg),
    productionBufferDays: Number(record.productionBufferDays ?? fallback?.productionBufferDays ?? 0),
    sortOrder: Number(record.sortOrder ?? fallback?.sortOrder ?? index + 1),
    enabled: record.enabled ?? fallback?.enabled ?? true,
    showAtCheckout: record.showAtCheckout ?? fallback?.showAtCheckout ?? true,
    sameDayEligible: record.sameDayEligible ?? fallback?.sameDayEligible ?? false,
    nextDayEligible: record.nextDayEligible ?? fallback?.nextDayEligible ?? false,
    requiresManualApproval: record.requiresManualApproval ?? fallback?.requiresManualApproval ?? false,
  };
}

async function liveJson(endpoint: string, init?: RequestInit) {
  if (typeof window === 'undefined') return null;
  const res = await fetch(endpoint, init);
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'Internal delivery settings API failed.');
  return payload;
}

function mapLiveMethod(row: any, index = 0): ShippingMethodRecord {
  const metadata = row?.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {};
  return normaliseMethod({
    id: String(row?.id || row?.slug || `delivery-${index + 1}`),
    name: String(row?.name || row?.title || `Delivery method ${index + 1}`),
    channel: metadata.channel,
    status: metadata.status,
    risk: metadata.risk,
    carrier: metadata.carrier,
    serviceLevel: metadata.serviceLevel,
    cutoffTime: metadata.cutoffTime,
    transitDays: metadata.transitDays,
    surcharge: metadata.surcharge,
    eligiblePlants: metadata.eligiblePlants,
    owner: metadata.owner,
    notes: row?.description || metadata.notes,
    enabled: metadata.enabled,
    showAtCheckout: metadata.showAtCheckout,
    publicLabel: metadata.publicLabel,
    checkoutDescription: metadata.checkoutDescription,
    fulfilmentMode: metadata.fulfilmentMode,
    zoneType: metadata.zoneType,
    zoneName: metadata.zoneName,
    postcodeRules: metadata.postcodeRules,
    pricingBasis: metadata.pricingBasis,
    basePriceMinor: metadata.basePriceMinor,
    freeAboveMinor: metadata.freeAboveMinor,
    minSubtotalMinor: metadata.minSubtotalMinor,
    maxSubtotalMinor: metadata.maxSubtotalMinor,
    maxWeightKg: metadata.maxWeightKg,
    productionBufferDays: metadata.productionBufferDays,
    sameDayEligible: metadata.sameDayEligible,
    nextDayEligible: metadata.nextDayEligible,
    requiresManualApproval: metadata.requiresManualApproval,
    sortOrder: metadata.sortOrder,
    taxClass: metadata.taxClass,
  }, index);
}

function livePayload(record: ShippingMethodRecord) {
  const normalised = normaliseMethod(record);
  return {
    id: normalised.id,
    slug: slugify(normalised.name, normalised.id),
    name: normalised.name,
    title: normalised.name,
    description: normalised.notes,
    metadataJson: {
      recordType: 'delivery-settings-method',
      channel: normalised.channel,
      status: normalised.status,
      risk: normalised.risk,
      carrier: normalised.carrier,
      serviceLevel: normalised.serviceLevel,
      cutoffTime: normalised.cutoffTime,
      transitDays: normalised.transitDays,
      surcharge: normalised.surcharge,
      eligiblePlants: normalised.eligiblePlants,
      owner: normalised.owner,
      notes: normalised.notes,
      enabled: normalised.enabled,
      showAtCheckout: normalised.showAtCheckout,
      publicLabel: normalised.publicLabel,
      checkoutDescription: normalised.checkoutDescription,
      fulfilmentMode: normalised.fulfilmentMode,
      zoneType: normalised.zoneType,
      zoneName: normalised.zoneName,
      postcodeRules: normalised.postcodeRules,
      pricingBasis: normalised.pricingBasis,
      basePriceMinor: normalised.basePriceMinor,
      freeAboveMinor: normalised.freeAboveMinor,
      minSubtotalMinor: normalised.minSubtotalMinor,
      maxSubtotalMinor: normalised.maxSubtotalMinor,
      maxWeightKg: normalised.maxWeightKg,
      productionBufferDays: normalised.productionBufferDays,
      sameDayEligible: normalised.sameDayEligible,
      nextDayEligible: normalised.nextDayEligible,
      requiresManualApproval: normalised.requiresManualApproval,
      sortOrder: normalised.sortOrder,
      taxClass: normalised.taxClass,
    },
  };
}

async function tryLiveMethods(): Promise<ShippingMethodRecord[] | null> {
  try {
    const payload = await liveJson(LIVE_ENDPOINT, { cache: 'no-store' });
    const raw = payload?.data?.items || payload?.data || [];
    if (!Array.isArray(raw)) return null;
    return raw.map(mapLiveMethod).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  } catch {
    return null;
  }
}

async function writeLiveMethod(record: ShippingMethodRecord) {
  const payload = livePayload(record);
  try {
    const patched = await liveJson(LIVE_ENDPOINT, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return mapLiveMethod(patched?.data || payload);
  } catch (patchError) {
    const posted = await liveJson(LIVE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return mapLiveMethod(posted?.data || payload);
  }
}

async function deleteLiveMethod(id: string) {
  await liveJson(`${LIVE_ENDPOINT}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export const shippingMethodsService = {
  getMethods: async (): Promise<ShippingMethodRecord[]> => {
    const live = await tryLiveMethods();
    if (live) return live;
    return load(KEY, shippingMethodRecordsMock).map(normaliseMethod).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  },

  saveMethod: async (record: ShippingMethodRecord) => {
    const normalised = normaliseMethod(record);
    try {
      const live = await writeLiveMethod(normalised);
      const items = load(KEY, shippingMethodRecordsMock).map(normaliseMethod);
      save(KEY, items.some((item) => item.id === live.id) ? items.map((item) => (item.id === live.id ? live : item)) : [live, ...items]);
      return live;
    } catch {
      const items = load(KEY, shippingMethodRecordsMock).map(normaliseMethod);
      const next = items.some((item) => item.id === normalised.id)
        ? items.map((item) => (item.id === normalised.id ? normalised : item))
        : [normalised, ...items];
      save(KEY, next);
      return normalised;
    }
  },

  deleteMethod: async (id: string) => {
    try { await deleteLiveMethod(id); } catch {}
    save(KEY, load(KEY, shippingMethodRecordsMock).map(normaliseMethod).filter((item) => item.id !== id));
  },

  resetMethods: async () => save(KEY, shippingMethodRecordsMock),

  seedDefaults: async () => {
    for (const method of shippingMethodRecordsMock) {
      await shippingMethodsService.saveMethod(method);
    }
    return shippingMethodsService.getMethods();
  }
};
