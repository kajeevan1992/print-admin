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

export const vendorOpsService = {
  getVendors: async (): Promise<VendorRecord[]> => load(KEY, vendorRecordsMock),
  saveVendor: async (vendor: VendorRecord) => {
    const items = load(KEY, vendorRecordsMock);
    const next = items.some((item) => item.id === vendor.id) ? items.map((item) => (item.id === vendor.id ? vendor : item)) : [vendor, ...items];
    save(KEY, next);
    return vendor;
  },
  deleteVendor: async (id: string) => save(KEY, load(KEY, vendorRecordsMock).filter((item) => item.id !== id)),
  resetVendors: async () => save(KEY, vendorRecordsMock)
};
