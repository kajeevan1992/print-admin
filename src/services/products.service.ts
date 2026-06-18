import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import { calculateProductEstimate } from '@/lib/product-system';
import type { Product, ProductAttribute, ProductComment, ProductFormValues, ProductInventory, ProductListQuery, ProductTag, RelatedProduct, ProductType, ProductStatus, ProductOptionGroup } from '@/modules/products/types';

let productsStore: Product[] = [];
const STORAGE_KEY = 'print-admin-products-store';
const wait = async () => new Promise((resolve) => setTimeout(resolve, 80));

type ProductMetadataJson = { optionGroups?: ProductOptionGroup[]; productSystem?: Product['productSystem']; templateRules?: Product['templateRules']; productModeSettings?: Product['productModeSettings']; taxSettings?: Product['taxSettings']; vatRate?: number; vatClass?: string; taxClass?: string; vatLabel?: string; thumbnailUrl?: string; imageUrl?: string };
type InternalCatalogProduct = { id: string; slug?: string; name?: string; title?: string; description?: string | null; subtitle?: string | null; productType?: ProductType; status?: ProductStatus | string; isActive?: boolean; isGlobal?: boolean; categoryId?: string | null; priceFromMinor?: number | null; currency?: string; createdAt?: string; updatedAt?: string; metadataJson?: ProductMetadataJson | null; optionGroups?: ProductOptionGroup[]; productSystem?: Product['productSystem']; templateRules?: Product['templateRules']; productModeSettings?: Product['productModeSettings']; taxSettings?: Product['taxSettings'] };
type InternalCatalogList<T> = { items: T[]; pagination?: { page: number; limit: number; total: number; totalPages: number } };
type InternalCatalogResponse<T> = { ok?: boolean; data?: T; error?: string };

function devFallbackEnabled() { return process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_DEV_PRODUCT_STORE === 'true'; }
function readStore(): Product[] { if (!devFallbackEnabled()) return productsStore; if (typeof window === 'undefined') return productsStore; try { const raw = window.localStorage.getItem(STORAGE_KEY); if (!raw) return productsStore; const parsed = JSON.parse(raw) as Product[]; return Array.isArray(parsed) ? parsed : productsStore; } catch { return productsStore; } }
function writeStore(next: Product[]) { productsStore = next; if (devFallbackEnabled() && typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
function isBrowserRuntime() { return typeof window !== 'undefined' && typeof fetch === 'function'; }
function makeSlug(name: string) { return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function mapCurrency(value?: string): Product['priceMapping']['currency'] { return String(value || '').toUpperCase() === 'USD' ? 'USD' : 'GBP'; }
function brandedProductThumbnail(name: string) {
  const initials = encodeURIComponent((name || 'HO').slice(0, 2).toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="#18A7D0"/><text x="48" y="56" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
async function readInternalCatalog<T>(path: string, params?: Record<string, string | number | undefined>) { const query = new URLSearchParams(); Object.entries(params || {}).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); }); const response = await fetch(`/api/internal/catalog/${path}${query.toString() ? `?${query}` : ''}`, { cache: 'no-store' }); const payload = (await response.json().catch(() => ({}))) as InternalCatalogResponse<T>; if (!response.ok || payload.ok === false) throw new Error(payload.error || `Failed to load catalog ${path}`); return payload.data as T; }
async function writeInternalCatalog<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body: Record<string, unknown>) { const response = await fetch(`/api/internal/catalog/${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = (await response.json().catch(() => ({}))) as InternalCatalogResponse<T>; if (!response.ok || payload.ok === false) throw new Error(payload.error || `Failed to write catalog ${path}`); return payload.data as T; }

function taxSettingsFromMetadata(item: InternalCatalogProduct): Product['taxSettings'] | undefined {
  const meta = item.metadataJson || {};
  if (item.taxSettings) return item.taxSettings;
  if (meta.taxSettings) return meta.taxSettings;
  if (meta.vatRate !== undefined || meta.vatClass || meta.taxClass) {
    return { taxClass: (meta.vatClass || meta.taxClass || 'custom') as any, vatRate: Number(meta.vatRate || 0), vatLabel: meta.vatLabel || '', preset: 'auto', forceVatOnDesignServices: true };
  }
  return undefined;
}

function mapInternalProduct(item: InternalCatalogProduct, index = 0): Product {
  const name = item.name || item.title || item.slug || item.id;
  const slug = item.slug || makeSlug(name);
  const updated = item.updatedAt || item.createdAt || new Date().toISOString();
  const published = typeof item.isActive === 'boolean' ? item.isActive : item.status === 'published';
  const metadata = item.metadataJson || {};
  return {
    id: item.id,
    sortOrder: index + 1,
    slug,
    name,
    description: item.description || item.subtitle || '',
    productType: item.productType || 'online',
    creationMethod: 'blank',
    categoryId: item.categoryId || '',
    vendorId: '', hotFolder: '', pages: 1, units: 'mm', width: 0, height: 0, bleed: 0,
    cmsPageLink: `/products/${slug}`, previewUrl: `/products/${item.id}`,
    status: published ? 'published' : 'draft', published, isGlobal: typeof item.isGlobal === 'boolean' ? item.isGlobal : false,
    storefrontIds: [], channelIds: [], thumbnail: metadata.thumbnailUrl || metadata.imageUrl || brandedProductThumbnail(name),
    lastSavedAt: updated,
    productNumbers: { itemNumber: item.id, modelNumber: item.id, integrationId: '' },
    templateDefaults: { scaleFactor: 1, zoomState: 'fit', palette: 'Default', colorSpace: 'CMYK', editorMode: 'simple', textModes: ['point'], imageMode: 'contain', previewType: '2D', photoGroup: 'Default', model3d: '', defaultFont: 'Inter', toggles: [], rules: [] },
    templateSetup: { setupProfile: 'default', allowUpload: true, allowLayers: true, smartSnapping: true, bleedLocked: false, showSafeArea: true },
    templateAssets: { fonts: [], layouts: [], themes: [], cliparts: [] },
    priceMapping: { basePrice: (item.priceFromMinor || 0) / 100, sizeLabel: '', dielineMapping: '', currency: mapCurrency(item.currency) },
    tags: [], comments: [], internalNotes: '', inventory: { onHandQuantity: 0, reorderQuantity: 0 }, relatedProducts: [], attributes: [], alternateViews: [], updatedAt: updated.slice(0, 10),
    productSystem: item.productSystem || item.metadataJson?.productSystem,
    templateRules: item.templateRules || item.metadataJson?.templateRules,
    optionGroups: item.optionGroups || item.metadataJson?.optionGroups || [],
    productModeSettings: item.productModeSettings || item.metadataJson?.productModeSettings,
    taxSettings: taxSettingsFromMetadata(item),
  };
}

function createProductFromForm(payload: ProductFormValues): Product {
  const id = `p-${Math.floor(Math.random() * 9000 + 1000)}`;
  const name = payload.name.trim();
  const iso = new Date().toISOString();
  const taxSettings = payload.taxClass || payload.vatPreset ? { taxClass: payload.taxClass || 'auto', vatRate: payload.vatRate === '' || payload.vatRate === undefined ? undefined : Number(payload.vatRate), preset: payload.vatPreset || 'auto', forceVatOnDesignServices: true } as Product['taxSettings'] : undefined;
  return { ...mapInternalProduct({ id, name, slug: makeSlug(name), categoryId: payload.categoryId, status: 'draft', isActive: false, updatedAt: iso, currency: 'GBP', metadataJson: { taxSettings } }), productType: payload.productType, creationMethod: payload.creationMethod, pages: Number(payload.pages) || 1, units: payload.units || 'mm', width: Number(payload.width) || 0, height: Number(payload.height) || 0, bleed: Number(payload.bleed) || 0, priceMapping: { basePrice: calculateProductEstimate(Number(payload.quantity) || 250, payload.materialId || 'silk-350', payload.finishId || 'matt-lam', payload.printerId || 'hp-indigo-7k', payload.turnaround || 'standard').total, sizeLabel: payload.parametricSize || '', dielineMapping: '', currency: 'GBP' }, taxSettings };
}

function productToCatalogPayload(product: Partial<Product>) {
  const payload: Record<string, unknown> = { id: product.id, slug: product.slug, name: product.name, title: product.name, description: product.description, isActive: typeof product.published === 'boolean' ? product.published : undefined, isGlobal: typeof product.isGlobal === 'boolean' ? product.isGlobal : undefined, priceFromMinor: product.priceMapping?.basePrice !== undefined ? Math.round(product.priceMapping.basePrice * 100) : undefined, currency: 'GBP', productType: product.productType };
  const metadataJson: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(product, 'optionGroups')) metadataJson.optionGroups = product.optionGroups || [];
  if (Object.prototype.hasOwnProperty.call(product, 'productSystem')) metadataJson.productSystem = product.productSystem;
  if (Object.prototype.hasOwnProperty.call(product, 'templateRules')) metadataJson.templateRules = product.templateRules;
  if (Object.prototype.hasOwnProperty.call(product, 'productModeSettings')) metadataJson.productModeSettings = product.productModeSettings;
  if (Object.prototype.hasOwnProperty.call(product, 'taxSettings')) {
    metadataJson.taxSettings = product.taxSettings;
    metadataJson.vatRate = product.taxSettings?.taxClass === 'standard' ? 20 : product.taxSettings?.taxClass === 'zero' || product.taxSettings?.taxClass === 'exempt' ? 0 : product.taxSettings?.taxClass === 'custom' ? product.taxSettings?.vatRate : undefined;
    metadataJson.vatClass = product.taxSettings?.taxClass;
    metadataJson.taxClass = product.taxSettings?.taxClass;
    metadataJson.vatLabel = product.taxSettings?.vatLabel;
  }
  if (Object.keys(metadataJson).length) payload.metadataJson = metadataJson;
  if (Object.prototype.hasOwnProperty.call(product, 'categoryId')) payload.categoryId = product.categoryId || null;
  return payload;
}

export const productsService = {
  listProducts: async (params: ProductListQuery = {}): Promise<PaginatedResponse<Product>> => {
    if (isBrowserRuntime()) {
      const page = params.page ?? 1; const perPage = params.perPage ?? 20;
      const data = await readInternalCatalog<InternalCatalogList<InternalCatalogProduct>>('products', { search: params.search, page, limit: perPage });
      let items = (data.items || []).map(mapInternalProduct);
      if (params.categoryId) items = items.filter((product) => product.categoryId === params.categoryId);
      if (params.uncategorized) items = items.filter((product) => !product.categoryId);
      if (params.vendorId) items = items.filter((product) => product.vendorId === params.vendorId);
      return okPaginated(items, { page, perPage, total: data.pagination?.total ?? items.length, totalPages: data.pagination?.totalPages ?? 1 });
    }
    await wait();
    let items = [...readStore()];
    if (params.search) { const term = params.search.toLowerCase(); items = items.filter((product) => product.name.toLowerCase().includes(term) || product.slug.toLowerCase().includes(term) || product.productNumbers.itemNumber.toLowerCase().includes(term) || product.productNumbers.modelNumber.toLowerCase().includes(term)); }
    if (params.categoryId) items = items.filter((product) => product.categoryId === params.categoryId);
    if (params.vendorId) items = items.filter((product) => product.vendorId === params.vendorId);
    if (params.uncategorized) items = items.filter((product) => !product.categoryId);
    const page = params.page ?? 1; const perPage = params.perPage ?? 20; const start = (page - 1) * perPage;
    return okPaginated(items.slice(start, start + perPage), { page, perPage, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / perPage)) });
  },
  getProduct: async (id: string): Promise<ApiResponse<Product>> => { if (isBrowserRuntime()) { const found = await readInternalCatalog<InternalCatalogProduct>('products/' + encodeURIComponent(id)); if (!found) throw new Error('Product not found'); return ok(mapInternalProduct(found)); } await wait(); const product = readStore().find((item) => item.id === id); if (!product) throw new Error('Product not found'); return ok(product); },
  createProduct: async (payload: ProductFormValues): Promise<ApiResponse<Product>> => { const created = createProductFromForm(payload); if (isBrowserRuntime()) { const saved = await writeInternalCatalog<InternalCatalogProduct>('products', 'POST', productToCatalogPayload(created)); return ok(mapInternalProduct(saved)); } await wait(); writeStore([created, ...readStore()]); return ok(created); },
  updateProduct: async (id: string, changes: Partial<Product>): Promise<ApiResponse<Product>> => { if (isBrowserRuntime()) { const saved = await writeInternalCatalog<InternalCatalogProduct>(`products/${encodeURIComponent(id)}`, 'PATCH', productToCatalogPayload({ ...changes, id })); return ok(mapInternalProduct(saved)); } await wait(); const current = readStore().find((item) => item.id === id); if (!current) throw new Error('Product not found'); const updated: Product = { ...current, ...changes, lastSavedAt: new Date().toISOString(), updatedAt: new Date().toISOString().slice(0, 10) }; writeStore(readStore().map((item) => (item.id === id ? updated : item))); return ok(updated); },
  deleteProduct: async (id: string): Promise<ApiResponse<{ success: boolean }>> => { if (isBrowserRuntime()) { await writeInternalCatalog<{ ok: boolean }>(`products/${encodeURIComponent(id)}`, 'DELETE', {}); return ok({ success: true }); } await wait(); writeStore(readStore().filter((item) => item.id !== id)); return ok({ success: true }); },
  cloneProduct: async (id: string): Promise<ApiResponse<Product>> => { const product = (await productsService.getProduct(id)).data; const cloned = { ...product, id: `p-${Math.floor(Math.random() * 9000 + 1000)}`, name: `${product.name} Copy`, slug: makeSlug(`${product.name} copy`) }; if (isBrowserRuntime()) { const saved = await writeInternalCatalog<InternalCatalogProduct>('products', 'POST', productToCatalogPayload(cloned)); return ok(mapInternalProduct(saved)); } writeStore([cloned, ...readStore()]); return ok(cloned); },
  getProductAttributes: async (id: string): Promise<ApiResponse<{ items: ProductAttribute[] }>> => ok({ items: (await productsService.getProduct(id)).data.attributes }),
  getRelatedProducts: async (id: string): Promise<ApiResponse<{ items: RelatedProduct[] }>> => ok({ items: (await productsService.getProduct(id)).data.relatedProducts }),
  getProductComments: async (id: string): Promise<ApiResponse<{ items: ProductComment[] }>> => ok({ items: (await productsService.getProduct(id)).data.comments }),
  getProductInventory: async (id: string): Promise<ApiResponse<ProductInventory>> => ok((await productsService.getProduct(id)).data.inventory),
  listProductTags: async (): Promise<ApiResponse<{ items: ProductTag[] }>> => ok({ items: [] }),
};
