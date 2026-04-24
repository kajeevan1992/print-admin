import { shippingMethodRecordsMock, type ShippingMethodRecord } from '@/data/shipping-methods';

const KEY = 'admin_shipping_methods_store';
const LIVE_ENDPOINT = '/api/internal/catalog/shipping-methods';

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
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

async function liveJson(endpoint: string, init?: RequestInit) {
  if (typeof window === 'undefined') return null;
  const res = await fetch(endpoint, init);
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'Internal shipping methods API failed.');
  return payload;
}

function mapLiveMethod(row: any, index = 0): ShippingMethodRecord {
  const metadata = row?.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {};
  return {
    id: String(row.id || row.slug || `sm-${index + 1}`),
    name: String(row.name || row.title || `Shipping method ${index + 1}`),
    channel: (metadata.channel || 'DTC') as ShippingMethodRecord['channel'],
    status: (metadata.status || 'active') as ShippingMethodRecord['status'],
    risk: (metadata.risk || 'healthy') as ShippingMethodRecord['risk'],
    carrier: String(metadata.carrier || ''),
    serviceLevel: String(metadata.serviceLevel || ''),
    cutoffTime: String(metadata.cutoffTime || '16:00'),
    transitDays: String(metadata.transitDays || '2-3 days'),
    surcharge: Number(metadata.surcharge ?? 0),
    eligiblePlants: Array.isArray(metadata.eligiblePlants) ? metadata.eligiblePlants.map(String) : ['North'],
    owner: String(metadata.owner || ''),
    notes: String(row.description || metadata.notes || ''),
  };
}

function livePayload(record: ShippingMethodRecord) {
  return {
    id: record.id,
    slug: slugify(record.name, record.id),
    name: record.name,
    title: record.name,
    description: record.notes,
    metadataJson: {
      recordType: 'shipping-method',
      channel: record.channel,
      status: record.status,
      risk: record.risk,
      carrier: record.carrier,
      serviceLevel: record.serviceLevel,
      cutoffTime: record.cutoffTime,
      transitDays: record.transitDays,
      surcharge: record.surcharge,
      eligiblePlants: record.eligiblePlants,
      owner: record.owner,
      notes: record.notes,
    },
  };
}

async function tryLiveMethods(): Promise<ShippingMethodRecord[] | null> {
  try {
    const payload = await liveJson(LIVE_ENDPOINT, { cache: 'no-store' });
    const raw = payload?.data?.items || payload?.data || [];
    if (!Array.isArray(raw)) return null;
    return raw.map(mapLiveMethod);
  } catch {
    return null;
  }
}

async function writeLiveMethod(record: ShippingMethodRecord) {
  const payload = await liveJson(LIVE_ENDPOINT, {
    method: record.id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(livePayload(record)),
  });
  return mapLiveMethod(payload?.data || livePayload(record));
}

async function deleteLiveMethod(id: string) {
  await liveJson(`${LIVE_ENDPOINT}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export const shippingMethodsService = {
  getMethods: async (): Promise<ShippingMethodRecord[]> => {
    const live = await tryLiveMethods();
    if (live) return live;
    return load(KEY, shippingMethodRecordsMock);
  },
  saveMethod: async (record: ShippingMethodRecord) => {
    try {
      const live = await writeLiveMethod(record);
      const items = load(KEY, shippingMethodRecordsMock);
      save(KEY, items.some((item) => item.id === live.id) ? items.map((item) => (item.id === live.id ? live : item)) : [live, ...items]);
      return live;
    } catch {
      const items = load(KEY, shippingMethodRecordsMock);
      const next = items.some((item) => item.id === record.id)
        ? items.map((item) => (item.id === record.id ? record : item))
        : [record, ...items];
      save(KEY, next);
      return record;
    }
  },
  deleteMethod: async (id: string) => {
    try { await deleteLiveMethod(id); } catch {}
    save(KEY, load(KEY, shippingMethodRecordsMock).filter((item) => item.id !== id));
  },
  resetMethods: async () => save(KEY, shippingMethodRecordsMock)
};
