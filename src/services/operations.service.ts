import { artworkProofsMock, customersMock, generalSettingsMock, productionJobsMock, quotesMock, type ArtworkProof, type CustomerRecord, type GeneralSetting, type ProductionJob, type QuoteRecord } from '@/data/operations';

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function save<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const KEYS = {
  quotes: 'admin_quotes_store',
  customers: 'admin_customers_store',
  production: 'admin_production_store',
  artworkProofs: 'admin_artwork_proofs_store',
  settings: 'admin_general_settings_store'
};

type ListResponse<T> = { ok?: boolean; data?: { items?: T[] } | T[]; payload?: { data?: T[] } | T[]; error?: string };

function endpointFor(key: string) {
  return `/api/internal/config/${encodeURIComponent(key)}`;
}

function extractItems<T>(payload: ListResponse<T> | null): T[] | null {
  if (!payload) return null;
  const direct = Array.isArray(payload.data) ? payload.data : payload.data?.items;
  if (Array.isArray(direct)) return direct as T[];
  const nested = Array.isArray(payload.payload) ? payload.payload : payload.payload?.data;
  if (Array.isArray(nested)) return nested as T[];
  return null;
}

async function readDbList<T>(key: string, fallback: T[]): Promise<T[]> {
  if (typeof window === 'undefined') return fallback;
  try {
    const res = await fetch(endpointFor(key), { cache: 'no-store' });
    const payload = (await res.json().catch(() => null)) as ListResponse<T> | null;
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal config API read failed.');
    const items = extractItems<T>(payload);
    if (items && items.length) {
      save(key, items);
      return items;
    }
    const local = load<T[]>(key, [] as T[]);
    return local.length ? local : fallback;
  } catch {
    return load(key, fallback);
  }
}

async function writeDbList<T>(key: string, next: T[], title: string) {
  save(key, next);
  if (typeof window === 'undefined') return;
  try {
    await fetch(endpointFor(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: 'Operations workspace records', items: next, values: { count: String(next.length) } })
    });
  } catch {
    // Browser local fallback is already saved above.
  }
}

async function upsert<T extends { id: string }>(key: string, fallback: T[], item: T, title: string): Promise<T> {
  const items = await readDbList<T>(key, fallback);
  const next = items.some((row) => row.id === item.id) ? items.map((row) => (row.id === item.id ? item : row)) : [item, ...items];
  await writeDbList(key, next, title);
  return item;
}

async function remove<T extends { id: string }>(key: string, fallback: T[], id: string, title: string): Promise<void> {
  const items = await readDbList<T>(key, fallback);
  await writeDbList(key, items.filter((item) => item.id !== id), title);
}

export const operationsService = {
  getQuotes: async (): Promise<QuoteRecord[]> => readDbList(KEYS.quotes, quotesMock),
  saveQuote: async (quote: QuoteRecord) => upsert(KEYS.quotes, quotesMock, quote, 'Quotes'),
  deleteQuote: async (id: string) => remove(KEYS.quotes, quotesMock, id, 'Quotes'),

  getCustomers: async (): Promise<CustomerRecord[]> => readDbList(KEYS.customers, customersMock),
  saveCustomer: async (customer: CustomerRecord) => upsert(KEYS.customers, customersMock, customer, 'Customers'),
  deleteCustomer: async (id: string) => remove(KEYS.customers, customersMock, id, 'Customers'),

  getProductionJobs: async (): Promise<ProductionJob[]> => readDbList(KEYS.production, productionJobsMock),
  saveProductionJob: async (job: ProductionJob) => upsert(KEYS.production, productionJobsMock, job, 'Production Jobs'),
  deleteProductionJob: async (id: string) => remove(KEYS.production, productionJobsMock, id, 'Production Jobs'),

  getArtworkProofs: async (): Promise<ArtworkProof[]> => readDbList(KEYS.artworkProofs, artworkProofsMock),
  saveArtworkProof: async (proof: ArtworkProof) => upsert(KEYS.artworkProofs, artworkProofsMock, proof, 'Artwork Proofs'),
  deleteArtworkProof: async (id: string) => remove(KEYS.artworkProofs, artworkProofsMock, id, 'Artwork Proofs'),

  getGeneralSettings: async (): Promise<GeneralSetting[]> => readDbList(KEYS.settings, generalSettingsMock),
  saveGeneralSetting: async (setting: GeneralSetting) => upsert(KEYS.settings, generalSettingsMock, setting, 'General Settings')
};
