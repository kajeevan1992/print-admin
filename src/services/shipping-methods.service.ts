import { shippingMethodRecordsMock, type ShippingMethodRecord } from '@/data/shipping-methods';

const KEY = 'admin_shipping_methods_store';

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function save<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const shippingMethodsService = {
  getMethods: async (): Promise<ShippingMethodRecord[]> => load(KEY, shippingMethodRecordsMock),
  saveMethod: async (record: ShippingMethodRecord) => {
    const items = load(KEY, shippingMethodRecordsMock);
    const next = items.some((item) => item.id === record.id)
      ? items.map((item) => (item.id === record.id ? record : item))
      : [record, ...items];
    save(KEY, next);
    return record;
  },
  deleteMethod: async (id: string) => save(KEY, load(KEY, shippingMethodRecordsMock).filter((item) => item.id !== id)),
  resetMethods: async () => save(KEY, shippingMethodRecordsMock)
};
