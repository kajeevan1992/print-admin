import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import { http } from '@/services/api/http';
import type {
  Product,
  ProductAttribute,
  ProductComment,
  ProductFormValues,
  ProductInventory,
  ProductListQuery,
  RelatedProduct
} from '@/modules/products/types';

type BackendEnvelope<T> = {
  success: boolean;
  data: T;
};

type BackendPagination = {
  page?: number;
  perPage?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

type BackendListData<T> = {
  items: T[];
  pagination?: BackendPagination;
};

const toStringSafe = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const toNumberSafe = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && !Number.isNaN(value) ? value : fallback;

const toBooleanSafe = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toArraySafe = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const mapProductAttribute = (raw: Record<string, unknown>): ProductAttribute => ({
  id: toStringSafe(raw.id),
  name: toStringSafe(raw.name),
  type: (toStringSafe(raw.type, 'text') as ProductAttribute['type']),
  required: toBooleanSafe(raw.required),
  values: toArraySafe<string>(raw.values)
});

const mapProductComment = (raw: Record<string, unknown>): ProductComment => ({
  id: toStringSafe(raw.id),
  author: toStringSafe(raw.author),
  timestamp: toStringSafe(raw.timestamp),
  label: (toStringSafe(raw.label, 'internal') as ProductComment['label']),
  message: toStringSafe(raw.message)
});

const mapProductInventory = (raw: Record<string, unknown>): ProductInventory => ({
  id: toStringSafe(raw.id),
  sku: toStringSafe(raw.sku),
  warehouse: toStringSafe(raw.warehouse),
  quantity: toNumberSafe(raw.quantity),
  reorderThreshold: toNumberSafe(raw.reorderThreshold),
  availability: (toStringSafe(raw.availability, 'in-stock') as ProductInventory['availability'])
});

const mapRelatedProduct = (raw: Record<string, unknown>): RelatedProduct => ({
  id: toStringSafe(raw.id),
  name: toStringSafe(raw.name),
  slug: toStringSafe(raw.slug),
  category: toStringSafe(raw.category),
  thumbnail: toStringSafe(raw.thumbnail)
});

const mapProduct = (raw: Record<string, unknown>): Product => ({
  id: toStringSafe(raw.id),
  slug: toStringSafe(raw.slug),
  name: toStringSafe(raw.name),
  description: toStringSafe(raw.description),
  productType: (toStringSafe(raw.productType, 'templated') as Product['productType']),
  categoryId: toStringSafe(raw.categoryId),
  vendorId: toStringSafe(raw.vendorId),
  pages: toNumberSafe(raw.pages, 1),
  units: toStringSafe(raw.units, 'mm'),
  width: toNumberSafe(raw.width),
  height: toNumberSafe(raw.height),
  bleed: toNumberSafe(raw.bleed),
  status: (toStringSafe(raw.status, 'draft') as Product['status']),
  published: toBooleanSafe(raw.published),
  isGlobal: toBooleanSafe(raw.isGlobal),
  channelIds: toArraySafe<string>(raw.channelIds),
  thumbnail: toStringSafe(raw.thumbnail),
  productNumbers: {
    itemNumber: toStringSafe((raw.productNumbers as Record<string, unknown> | undefined)?.itemNumber),
    modelNumber: toStringSafe((raw.productNumbers as Record<string, unknown> | undefined)?.modelNumber),
    integrationId: toStringSafe((raw.productNumbers as Record<string, unknown> | undefined)?.integrationId)
  },
  templateDefaults: {
    scaleFactor: toNumberSafe((raw.templateDefaults as Record<string, unknown> | undefined)?.scaleFactor, 1),
    zoomState: toStringSafe(
      (raw.templateDefaults as Record<string, unknown> | undefined)?.zoomState,
      'fit'
    ) as Product['templateDefaults']['zoomState'],
    editorMode: toStringSafe(
      (raw.templateDefaults as Record<string, unknown> | undefined)?.editorMode,
      'simple'
    ) as Product['templateDefaults']['editorMode'],
    trimMode: toStringSafe(
      (raw.templateDefaults as Record<string, unknown> | undefined)?.trimMode,
      'safe'
    ) as Product['templateDefaults']['trimMode'],
    rotate: toNumberSafe((raw.templateDefaults as Record<string, unknown> | undefined)?.rotate, 0),
    imageMode: toStringSafe(
      (raw.templateDefaults as Record<string, unknown> | undefined)?.imageMode,
      'contain'
    ) as Product['templateDefaults']['imageMode'],
    colorSpace: toStringSafe(
      (raw.templateDefaults as Record<string, unknown> | undefined)?.colorSpace,
      'CMYK'
    ) as Product['templateDefaults']['colorSpace'],
    templateType: toStringSafe(
      (raw.templateDefaults as Record<string, unknown> | undefined)?.templateType,
      'marketing'
    ) as Product['templateDefaults']['templateType']
  },
  templateSetup: {
    productsPanel: toBooleanSafe((raw.templateSetup as Record<string, unknown> | undefined)?.productsPanel, true),
    uploadPhotos: toBooleanSafe((raw.templateSetup as Record<string, unknown> | undefined)?.uploadPhotos, true),
    imagePanel: toBooleanSafe((raw.templateSetup as Record<string, unknown> | undefined)?.imagePanel, true),
    imageSearch: toBooleanSafe((raw.templateSetup as Record<string, unknown> | undefined)?.imageSearch, true),
    layersPanel: toBooleanSafe((raw.templateSetup as Record<string, unknown> | undefined)?.layersPanel, false),
    socialImageImport: toBooleanSafe(
      (raw.templateSetup as Record<string, unknown> | undefined)?.socialImageImport,
      false
    ),
    addTextButton: toBooleanSafe((raw.templateSetup as Record<string, unknown> | undefined)?.addTextButton, true),
    restrictNewItem: toBooleanSafe(
      (raw.templateSetup as Record<string, unknown> | undefined)?.restrictNewItem,
      false
    )
  },
  priceMapping: {
    basePrice: toNumberSafe((raw.priceMapping as Record<string, unknown> | undefined)?.basePrice, 0),
    sizeLabel: toStringSafe((raw.priceMapping as Record<string, unknown> | undefined)?.sizeLabel),
    currency: 'USD'
  },
  tags: toArraySafe<Record<string, unknown>>(raw.tags).map((tag) => ({
    id: toStringSafe(tag.id),
    label: toStringSafe(tag.label),
    color: (toStringSafe(tag.color, 'blue') as Product['tags'][number]['color'])
  })),
  comments: toArraySafe<Record<string, unknown>>(raw.comments).map(mapProductComment),
  inventory: toArraySafe<Record<string, unknown>>(raw.inventory).map(mapProductInventory),
  relatedProducts: toArraySafe<Record<string, unknown>>(raw.relatedProducts).map(mapRelatedProduct),
  updatedAt: toStringSafe(raw.updatedAt)
});

const normalizePagination = (pagination: BackendPagination | undefined, itemsLength: number) => ({
  page: pagination?.page ?? 1,
  perPage: pagination?.perPage ?? pagination?.limit ?? (itemsLength > 0 ? itemsLength : 1),
  total: pagination?.total ?? itemsLength,
  totalPages: pagination?.totalPages ?? 1
});

export const productsService = {
  listProducts: async (params: ProductListQuery = {}): Promise<PaginatedResponse<Product>> => {
    const response = await http.get<BackendEnvelope<BackendListData<Record<string, unknown>>>>(
      '/products',
      params
    );

    const items = toArraySafe<Record<string, unknown>>(response.data.items).map(mapProduct);
    const meta = normalizePagination(response.data.pagination, items.length);

    return okPaginated(items, meta);
  },

  getProducts: async (): Promise<Product[]> => {
    const response = await productsService.listProducts({ page: 1, perPage: 100 });
    return response.data.items;
  },

  getProduct: async (id: string): Promise<ApiResponse<Product>> => {
    const response = await http.get<BackendEnvelope<Record<string, unknown>>>(`/products/${id}`);
    return ok(mapProduct(response.data));
  },

  getProductById: async (id: string): Promise<Product | null> => {
    try {
      const response = await productsService.getProduct(id);
      return response.data;
    } catch {
      return null;
    }
  },

  createProduct: async (payload: ProductFormValues): Promise<ApiResponse<Product>> => {
    const response = await http.post<BackendEnvelope<Record<string, unknown>>>('/products', {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      productType: payload.productType,
      categoryId: payload.categoryId,
      vendorId: payload.vendorId,
      pages: Number(payload.pages) || 1,
      units: payload.units,
      width: Number(payload.width) || 0,
      height: Number(payload.height) || 0,
      bleed: Number(payload.bleed) || 0,
      isGlobal: false,
      published: false,
      channelIds: []
    });

    return ok(mapProduct(response.data));
  },

  updateProduct: async (
    id: string,
    changes: Partial<Product>
  ): Promise<ApiResponse<Product>> => {
    const response = await http.patch<BackendEnvelope<Record<string, unknown>>>(
      `/products/${id}`,
      changes
    );

    return ok(mapProduct(response.data));
  },

  getProductAttributes: async (id: string): Promise<ApiResponse<{ items: ProductAttribute[] }>> => {
    try {
      const response = await http.get<BackendEnvelope<BackendListData<Record<string, unknown>>>>(
        `/products/${id}/attributes`
      );

      return ok({
        items: toArraySafe<Record<string, unknown>>(response.data.items).map(mapProductAttribute)
      });
    } catch {
      return ok({ items: [] });
    }
  },

  getRelatedProducts: async (id: string): Promise<ApiResponse<{ items: RelatedProduct[] }>> => {
    try {
      const response = await http.get<BackendEnvelope<BackendListData<Record<string, unknown>>>>(
        `/products/${id}/related`
      );

      return ok({
        items: toArraySafe<Record<string, unknown>>(response.data.items).map(mapRelatedProduct)
      });
    } catch {
      return ok({ items: [] });
    }
  },

  getProductComments: async (id: string): Promise<ApiResponse<{ items: ProductComment[] }>> => {
    try {
      const response = await http.get<BackendEnvelope<BackendListData<Record<string, unknown>>>>(
        `/products/${id}/comments`
      );

      return ok({
        items: toArraySafe<Record<string, unknown>>(response.data.items).map(mapProductComment)
      });
    } catch {
      return ok({ items: [] });
    }
  },

  getProductInventory: async (
    id: string
  ): Promise<ApiResponse<{ items: ProductInventory[] }>> => {
    try {
      const response = await http.get<BackendEnvelope<BackendListData<Record<string, unknown>>>>(
        `/products/${id}/inventory`
      );

      return ok({
        items: toArraySafe<Record<string, unknown>>(response.data.items).map(mapProductInventory)
      });
    } catch {
      return ok({ items: [] });
    }
  }
};
