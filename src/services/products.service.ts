import { productsMock } from '@/data/products';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type {
  Product,
  ProductAttribute,
  ProductComment,
  ProductFormValues,
  ProductInventory,
  ProductListQuery,
  RelatedProduct
} from '@/modules/products/types';

const database: Product[] = [...productsMock];

const generateId = () => `p-${Math.floor(Math.random() * 9000) + 1000}`;

const createSlug = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const applyFilters = (items: Product[], params: ProductListQuery): Product[] => {
  let filtered = [...items];

  if (params.search) {
    const term = params.search.toLowerCase();
    filtered = filtered.filter((item) =>
      [item.name, item.slug, item.productNumbers.itemNumber].some((value) => value.toLowerCase().includes(term))
    );
  }

  if (params.categoryId) {
    filtered = filtered.filter((item) => item.categoryId === params.categoryId);
  }

  if (params.vendorId) {
    filtered = filtered.filter((item) => item.vendorId === params.vendorId);
  }

  if (params.uncategorized) {
    filtered = filtered.filter((item) => !item.categoryId);
  }

  return filtered;
};

export const productsService = {
  listProducts: async (params: ProductListQuery = {}): Promise<PaginatedResponse<Product>> => {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const filtered = applyFilters(database, params);
    const start = (page - 1) * perPage;
    const items = filtered.slice(start, start + perPage);

    return okPaginated(items, {
      page,
      perPage,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / perPage))
    });
  },

  getProduct: async (id: string): Promise<ApiResponse<Product>> => {
    const product = database.find((item) => item.id === id);

    if (!product) {
      throw new Error('Product not found');
    }

    return ok(product);
  },

  createProduct: async (payload: ProductFormValues): Promise<ApiResponse<Product>> => {
    const now = new Date().toISOString();
    const id = generateId();
    const product: Product = {
      id,
      sortOrder: database.length * 10 + 10,
      slug: createSlug(payload.name),
      name: payload.name,
      description: '',
      productType: payload.productType,
      creationMethod: payload.creationMethod,
      categoryId: payload.categoryId,
      vendorId: 'ven-blueline',
      hotFolder: '',
      pages: Number(payload.pages) || 1,
      units: payload.units || 'mm',
      width: Number(payload.width) || 0,
      height: Number(payload.height) || 0,
      bleed: Number(payload.bleed) || 0,
      cmsPageLink: `/products/${id}`,
      previewUrl: `/storefront/products/${id}`,
      status: 'draft',
      published: false,
      isGlobal: false,
      storefrontIds: [],
      channelIds: [],
      thumbnail: 'https://placehold.co/96x96/111827/ffffff?text=NP',
      lastSavedAt: now,
      productNumbers: { itemNumber: `I-${id}`, modelNumber: `M-${id}`, integrationId: `EXT-${id}` },
      templateDefaults: {
        scaleFactor: 1,
        zoomState: 'fit',
        palette: 'Default',
        colorSpace: 'CMYK',
        editorMode: 'simple',
        textModes: ['point'],
        imageMode: 'contain',
        previewType: '2D',
        photoGroup: 'Default',
        model3d: '',
        defaultFont: '',
        toggles: [],
        rules: []
      },
      templateSetup: {
        setupProfile: 'default',
        allowUpload: true,
        allowLayers: false,
        smartSnapping: true,
        bleedLocked: false,
        showSafeArea: true
      },
      templateAssets: { fonts: [], layouts: [], themes: [], cliparts: [] },
      priceMapping: {
        basePrice: 0,
        sizeLabel: '',
        dielineMapping: '',
        currency: 'USD',
        parametricStandard:
          payload.creationMethod === 'parametric-standard'
            ? {
                standard: payload.parametricStandard,
                size: payload.parametricSize,
                allowance: payload.parametricAllowance,
                material: payload.parametricMaterial
              }
            : undefined
      },
      tags: [],
      comments: [{ id: `${id}-note`, author: 'Admin', timestamp: now.slice(0, 16).replace('T', ' '), label: 'internal', message: `Product created from ${payload.creationMethod}.` }],
      internalNotes: 'Initial product record created from Add Product flow.',
      inventory: { onHandQuantity: 0, reorderQuantity: 0 },
      relatedProducts: [],
      attributes: [],
      alternateViews: [],
      updatedAt: now.slice(0, 10),
      pdfFileUrl: payload.productType === 'static' ? payload.idmlFileName || payload.printEditorTemplateName || '' : undefined
    };

    database.unshift(product);

    return ok(product);
  },

  updateProduct: async (id: string, changes: Partial<Product>): Promise<ApiResponse<Product>> => {
    const index = database.findIndex((item) => item.id === id);

    if (index < 0) {
      throw new Error('Product not found');
    }

    database[index] = {
      ...database[index],
      ...changes,
      lastSavedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    return ok(database[index]);
  },

  deleteProduct: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    const index = database.findIndex((item) => item.id === id);
    if (index >= 0) database.splice(index, 1);
    return ok({ success: true });
  },

  cloneProduct: async (id: string): Promise<ApiResponse<Product>> => {
    const product = database.find((item) => item.id === id);
    if (!product) throw new Error('Product not found');

    const clone: Product = {
      ...product,
      id: generateId(),
      slug: `${product.slug}-copy`,
      name: `${product.name} (Copy)`,
      published: false,
      status: 'draft',
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    database.unshift(clone);
    return ok(clone);
  },

  getProductAttributes: async (id: string): Promise<ApiResponse<{ items: ProductAttribute[] }>> => {
    const product = database.find((item) => item.id === id);
    return ok({ items: product?.attributes ?? [] });
  },

  getRelatedProducts: async (id: string): Promise<ApiResponse<{ items: RelatedProduct[] }>> => {
    const product = database.find((item) => item.id === id);
    return ok({ items: product?.relatedProducts ?? [] });
  },

  getProductComments: async (id: string): Promise<ApiResponse<{ items: ProductComment[] }>> => {
    const product = database.find((item) => item.id === id);
    return ok({ items: product?.comments ?? [] });
  },

  getProductInventory: async (id: string): Promise<ApiResponse<{ item: ProductInventory }>> => {
    const product = database.find((item) => item.id === id);
    return ok({ item: product?.inventory ?? { onHandQuantity: 0, reorderQuantity: 0 } });
  }
};
