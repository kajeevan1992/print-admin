import { vendorRecordsMock, type VendorRecord } from '@/data/vendor-ops';

const KEY = 'admin_vendor_records_store';

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function save<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function endpointFor(key: string) {
  return `/api/internal/config/${encodeURIComponent(key)}`;
}

function extractItems(payload: any): VendorRecord[] | null {
  const direct = Array.isArray(payload?.data) ? payload.data : payload?.data?.items;
  if (Array.isArray(direct)) return direct as VendorRecord[];
  const nested = Array.isArray(payload?.payload) ? payload.payload : payload?.payload?.data;
  if (Array.isArray(nested)) return nested as VendorRecord[];
  return null;
}

async function readDbVendors(): Promise<VendorRecord[]> {
  if (typeof window === 'undefined') return vendorRecordsMock;
  try {
    const res = await fetch(endpointFor(KEY), { cache: 'no-store' });
    const payload = await res.json().catch(() => null);
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal config API read failed.');
    const items = extractItems(payload);
    if (items && items.length) {
      save(KEY, items);
      return items;
    }
    const local = load<VendorRecord[]>(KEY, []);
    return local.length ? local : vendorRecordsMock;
  } catch {
    return load(KEY, vendorRecordsMock);
  }
}

async function writeDbVendors(next: VendorRecord[]) {
  save(KEY, next);
  if (typeof window === 'undefined') return;
  try {
    await fetch(endpointFor(KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Vendors', description: 'Vendor operations records', items: next, values: { count: String(next.length) } })
    });
  } catch {
    // Browser local fallback is already saved above.
  }
}

export const vendorOpsService = {
  getVendors: async (): Promise<VendorRecord[]> => readDbVendors(),
  saveVendor: async (vendor: VendorRecord) => {
    const items = await readDbVendors();
    const next = items.some((item) => item.id === vendor.id) ? items.map((item) => (item.id === vendor.id ? vendor : item)) : [vendor, ...items];
    await writeDbVendors(next);
    return vendor;
  },
  deleteVendor: async (id: string) => {
    const items = await readDbVendors();
    await writeDbVendors(items.filter((item) => item.id !== id));
  },
  resetVendors: async () => writeDbVendors(vendorRecordsMock)
};
