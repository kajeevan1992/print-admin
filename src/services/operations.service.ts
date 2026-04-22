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

export const operationsService = {
  getQuotes: async (): Promise<QuoteRecord[]> => load(KEYS.quotes, quotesMock),
  saveQuote: async (quote: QuoteRecord) => {
    const items = load(KEYS.quotes, quotesMock);
    const next = items.some((item) => item.id === quote.id) ? items.map((item) => (item.id === quote.id ? quote : item)) : [quote, ...items];
    save(KEYS.quotes, next);
    return quote;
  },
  deleteQuote: async (id: string) => save(KEYS.quotes, load(KEYS.quotes, quotesMock).filter((item) => item.id !== id)),

  getCustomers: async (): Promise<CustomerRecord[]> => load(KEYS.customers, customersMock),
  saveCustomer: async (customer: CustomerRecord) => {
    const items = load(KEYS.customers, customersMock);
    const next = items.some((item) => item.id === customer.id) ? items.map((item) => (item.id === customer.id ? customer : item)) : [customer, ...items];
    save(KEYS.customers, next);
    return customer;
  },
  deleteCustomer: async (id: string) => save(KEYS.customers, load(KEYS.customers, customersMock).filter((item) => item.id !== id)),

  getProductionJobs: async (): Promise<ProductionJob[]> => load(KEYS.production, productionJobsMock),
  saveProductionJob: async (job: ProductionJob) => {
    const items = load(KEYS.production, productionJobsMock);
    const next = items.some((item) => item.id === job.id) ? items.map((item) => (item.id === job.id ? job : item)) : [job, ...items];
    save(KEYS.production, next);
    return job;
  },
  deleteProductionJob: async (id: string) => save(KEYS.production, load(KEYS.production, productionJobsMock).filter((item) => item.id !== id)),

  getArtworkProofs: async (): Promise<ArtworkProof[]> => {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/proxy/admin-artwork', { cache: 'no-store' });
        const payload = await res.json().catch(() => null);
        if (res.ok && payload?.ok) {
          const raw = payload?.payload?.data || payload?.payload || [];
          if (Array.isArray(raw) && raw.length) {
            return raw.map((item, index) => ({
              id: item.id || `proof-${index + 1}`,
              orderNumber: item.orderReference || item.order?.orderNumber || item.orderId || `ORD-${index + 1}`,
              customer: item.customerEmail || item.order?.email || 'Customer',
              product: item.fileName || 'Artwork file',
              owner: 'Prepress Team',
              status: item.status === 'approved' ? 'approved' : item.status === 'awaiting-customer-fix' ? 'changes-requested' : 'awaiting-review',
              risk: 'low',
              dueDate: item.createdAt || new Date().toISOString(),
              notes: item.note || ''
            }));
          }
        }
      } catch {
        // fallback below
      }
    }
    return load(KEYS.artworkProofs, artworkProofsMock);
  },
  saveArtworkProof: async (proof: ArtworkProof) => {
    const items = load(KEYS.artworkProofs, artworkProofsMock);
    const next = items.some((item) => item.id === proof.id) ? items.map((item) => (item.id === proof.id ? proof : item)) : [proof, ...items];
    save(KEYS.artworkProofs, next);
    return proof;
  },
  deleteArtworkProof: async (id: string) => save(KEYS.artworkProofs, load(KEYS.artworkProofs, artworkProofsMock).filter((item) => item.id !== id)),

  getGeneralSettings: async (): Promise<GeneralSetting[]> => load(KEYS.settings, generalSettingsMock),
  saveGeneralSetting: async (setting: GeneralSetting) => {
    const items = load(KEYS.settings, generalSettingsMock);
    const next = items.some((item) => item.id === setting.id) ? items.map((item) => (item.id === setting.id ? setting : item)) : [setting, ...items];
    save(KEYS.settings, next);
    return setting;
  }
};
