import type { ArtworkProof, CustomerRecord, GeneralSetting, ProductionJob, QuoteRecord } from '@/data/operations';

const KEYS = { quotes: 'admin_quotes_store', customers: 'admin_customers_store', production: 'admin_production_store', artworkProofs: 'admin_artwork_proofs_store', settings: 'admin_general_settings_store' };
type ListResponse<T> = { ok?: boolean; data?: { items?: T[]; metadataJson?: { items?: T[] } } | T[]; payload?: { data?: T[] } | T[]; error?: string };
function endpointFor(key: string) { return `/api/internal/config/${encodeURIComponent(key)}/items`; }
function saveEndpointFor(key: string) { return `/api/internal/config/${encodeURIComponent(key)}`; }
function extractItems<T>(payload: ListResponse<T> | null): T[] { if (!payload) return []; const direct = Array.isArray(payload.data) ? payload.data : payload.data?.items || payload.data?.metadataJson?.items; if (Array.isArray(direct)) return direct as T[]; const nested = Array.isArray(payload.payload) ? payload.payload : payload.payload?.data; return Array.isArray(nested) ? nested as T[] : []; }
async function readDbList<T>(key: string): Promise<T[]> { const res = await fetch(endpointFor(key), { cache: 'no-store' }); const payload = (await res.json().catch(() => null)) as ListResponse<T> | null; if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal config API read failed.'); return extractItems<T>(payload); }
async function writeDbList<T>(key: string, next: T[], title: string) { const res = await fetch(saveEndpointFor(key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description: 'Operations workspace records', items: next, values: { count: String(next.length), savedAt: new Date().toISOString() } }) }); const payload = await res.json().catch(() => ({})); if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal config API save failed.'); }
async function upsert<T extends { id: string }>(key: string, item: T, title: string): Promise<T> { const items = await readDbList<T>(key); const next = items.some((row) => row.id === item.id) ? items.map((row) => (row.id === item.id ? item : row)) : [item, ...items]; await writeDbList(key, next, title); return item; }
async function remove<T extends { id: string }>(key: string, id: string, title: string): Promise<void> { const items = await readDbList<T>(key); await writeDbList(key, items.filter((item) => item.id !== id), title); }
async function readProductionBoardInternal(): Promise<ProductionJob[]> { try { const res = await fetch('/api/internal/catalog/production-board', { cache: 'no-store' }); const payload = await res.json().catch(() => null); if (!res.ok || payload?.ok === false) throw new Error('Internal production board API failed.'); const items = payload?.data?.items; return Array.isArray(items) ? items as ProductionJob[] : []; } catch { return []; } }
async function writeProductionBoardInternal(job: ProductionJob, action: 'upsert' | 'delete' = 'upsert') { const res = await fetch('/api/internal/catalog/production-board', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'delete' ? { action: 'delete', id: job.id } : { action: 'upsert', job }) }); return res.ok; }
export const operationsService = {
  getQuotes: async (): Promise<QuoteRecord[]> => readDbList(KEYS.quotes),
  saveQuote: async (quote: QuoteRecord) => upsert(KEYS.quotes, quote, 'Quotes'),
  deleteQuote: async (id: string) => remove<QuoteRecord>(KEYS.quotes, id, 'Quotes'),
  getCustomers: async (): Promise<CustomerRecord[]> => readDbList(KEYS.customers),
  saveCustomer: async (customer: CustomerRecord) => upsert(KEYS.customers, customer, 'Customers'),
  deleteCustomer: async (id: string) => remove<CustomerRecord>(KEYS.customers, id, 'Customers'),
  getProductionJobs: async (): Promise<ProductionJob[]> => { const internal = await readProductionBoardInternal(); return internal.length ? internal : readDbList(KEYS.production); },
  saveProductionJob: async (job: ProductionJob) => { const ok = await writeProductionBoardInternal(job, 'upsert'); if (!ok) return upsert(KEYS.production, job, 'Production Jobs'); return job; },
  deleteProductionJob: async (id: string) => { const ok = await writeProductionBoardInternal({ id } as ProductionJob, 'delete'); if (!ok) return remove<ProductionJob>(KEYS.production, id, 'Production Jobs'); },
  getArtworkProofs: async (): Promise<ArtworkProof[]> => readDbList(KEYS.artworkProofs),
  saveArtworkProof: async (proof: ArtworkProof) => upsert(KEYS.artworkProofs, proof, 'Artwork Proofs'),
  deleteArtworkProof: async (id: string) => remove<ArtworkProof>(KEYS.artworkProofs, id, 'Artwork Proofs'),
  getGeneralSettings: async (): Promise<GeneralSetting[]> => readDbList(KEYS.settings),
  saveGeneralSetting: async (setting: GeneralSetting) => upsert(KEYS.settings, setting, 'General Settings')
};
