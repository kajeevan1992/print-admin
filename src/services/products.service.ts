import { productAttributesByProductId } from '@/data/products';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import { http } from '@/services/api/http';
import type { Product, ProductAttribute, ProductComment, ProductFormValues, ProductInventory, ProductListQuery, RelatedProduct } from '@/modules/products/types';

type BackendEnvelope<T> = { success: boolean; data: T };

type BackendListData<T> = { items: T[]; pagination?: { page: number; perPage: number; total: number; totalPages?: number } };

const defaultTemplateDefaults: Product['templateDefaults'] = {
  scaleFactor: 1,
  zoomState: 'fit',
  editorMode: 'simple',
  trimMode: 'safe',
  rotate: 0,
  imageMode: 'contain',
  colorSpace: 'CMYK',
  templateType: 'marketing'
};

const defaultTemplateSetup: Product['templateSetup'] = {
  productsPanel: true,
  uploadPhotos: true,
  imagePanel: true,
  imageSearch: true,
  layersPanel: false,
  socialImageImport: false,
  addTextButton: true,
  restrictNewItem: false
};

const mapProduct = (raw: Record<string, unknown>): Product => ({
  id: String(raw.id),
  slug: String(raw.slug ?? raw.id),
  name: String(raw.name ?? 'Unnamed Product'),
  description: String(raw.description ?? ''),
  productType: (raw.productType as Product['productType']) ?? 'blank',
  categoryId: String(raw.categoryId ?? ''),
  vendorId: String(raw.vendorId ?? ''),
  pages: Number(raw.pages ?? 1),
  units: String(raw.units ?? 'mm'),
  width: Number(raw.width ?? 0),
  height: Number(raw.height ?? 0),
  bleed: Number(raw.bleed ?? 0),
  status: (raw.status as Product['status']) ?? 'draft',
  published: Boolean(raw.published),
  isGlobal: Boolean(raw.isGlobal),
  channelIds: Array.isArray(raw.channelIds) ? raw.channelIds.map(String) : [],
  thumbnail: String(raw.thumbnail ?? 'PR'),
  productNumbers: {
    itemNumber: String((raw.productNumbers as Record<string, unknown> | undefined)?.itemNumber ?? ''),
    modelNumber: String((raw.productNumbers as Record<string, unknown> | undefined)?.modelNumber ?? ''),
    integrationId: String((raw.productNumbers as Record<string, unknown> | undefined)?.integrationId ?? '')
  },
  templateDefaults: { ...defaultTemplateDefaults, ...(raw.templateDefaults as Partial<Product['templateDefaults']> | undefined) },
  templateSetup: { ...defaultTemplateSetup, ...(raw.templateSetup as Partial<Product['templateSetup']> | undefined) },
  priceMapping: {
    basePrice: Number((raw.priceMapping as Record<string, unknown> | undefined)?.basePrice ?? 0),
    sizeLabel: String((raw.priceMapping as Record<string, unknown> | undefined)?.sizeLabel ?? ''),
    currency: 'USD'
  },
  tags: Array.isArray(raw.tags) ? (raw.tags as Product['tags']) : [],
  comments: Array.isArray(raw.comments) ? (raw.comments as ProductComment[]) : [],
  inventory: Array.isArray(raw.inventory) ? (raw.inventory as ProductInventory[]) : [],
  relatedProducts: Array.isArray(raw.relatedProducts) ? (raw.relatedProducts as RelatedProduct[]) : [],
  updatedAt: String(raw.updatedAt ?? new Date().toISOString().slice(0, 10))
});

const toPayload = (payload: ProductFormValues) => ({
  ...payload,
  pages: Number(payload.pages),
  width: Number(payload.width),
  height: Number(payload.height),
  bleed: Number(payload.bleed)
});

export const productsService = {
  listProducts: async (params: ProductListQuery = {}): Promise<PaginatedResponse<Product>> => {
    const query = {
      search: params.search,
      categoryId: params.categoryId,
      vendorId: params.vendorId,
      published: params.published,
      isGlobal: params.isGlobal,
      page: params.page,
      perPage: params.perPage,
      sortBy: params.sortBy,
      sortDirection: params.sortDirection
    };

    const response = await http.get<BackendEnvelope<BackendListData<Record<string, unknown>>>>('/products', query);
    const items = (response.data.items ?? []).map(mapProduct);
    const pagination = response.data.pagination;

    return okPaginated(items, {
      page: pagination?.page ?? 1,
      perPage: pagination?.perPage ?? items.length || 1,
      total: pagination?.total ?? items.length,
      totalPages: pagination?.totalPages ?? 1
    });
  },

  getProduct: async (id: string): Promise<ApiResponse<Product>> => {
    const response = await http.get<BackendEnvelope<Record<string, unknown>>>(`/products/${id}`);
    return ok(mapProduct(response.data));
  },

  createProduct: async (payload: ProductFormValues): Promise<ApiResponse<Product>> => {
    const response = await http.post<BackendEnvelope<Record<string, unknown>>>('/products', toPayload(payload));
    return ok(mapProduct(response.data));
  },

  updateProduct: async (id: string, changes: Partial<Product>): Promise<ApiResponse<Product>> => {
    const response = await http.patch<BackendEnvelope<Record<string, unknown>>>(`/products/${id}`, changes);
    return ok(mapProduct(response.data));
  },

  getProductAttributes: async (id: string): Promise<ApiResponse<{ items: ProductAttribute[] }>> => ok({ items: productAttributesByProductId[id] ?? [] }),

  getRelatedProducts: async (id: string): Promise<ApiResponse<{ items: RelatedProduct[] }>> => {
    const product = await productsService.getProduct(id);
    return ok({ items: product.data.relatedProducts });
  },

  getProductComments: async (id: string): Promise<ApiResponse<{ items: ProductComment[] }>> => {
    const product = await productsService.getProduct(id);
    return ok({ items: product.data.comments });
  },

  getProductInventory: async (id: string): Promise<ApiResponse<{ items: ProductInventory[] }>> => {
    const product = await productsService.getProduct(id);
    return ok({ items: product.data.inventory });
  }
};
