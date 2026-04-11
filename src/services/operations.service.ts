import { customersMock, generalSettingsMock, productionJobsMock, quotesMock, type CustomerRecord, type GeneralSetting, type ProductionJob, type QuoteRecord } from '@/data/operations';

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

  getGeneralSettings: async (): Promise<GeneralSetting[]> => load(KEYS.settings, generalSettingsMock),
  saveGeneralSetting: async (setting: GeneralSetting) => {
    const items = load(KEYS.settings, generalSettingsMock);
    const next = items.some((item) => item.id === setting.id) ? items.map((item) => (item.id === setting.id ? setting : item)) : [setting, ...items];
    save(KEYS.settings, next);
    return setting;
  }
};
