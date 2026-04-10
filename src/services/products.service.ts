import { productsMock } from '@/data/products';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import { calculateProductEstimate, getFinishById, getMaterialById, getPrinterById, getTemplateById } from '@/lib/product-system';
import type {
  Product,
  ProductAttribute,
  ProductComment,
  ProductFormValues,
  ProductInventory,
  ProductListQuery,
  ProductTag,
  RelatedProduct
} from '@/modules/products/types';

let productsStore: Product[] = [...productsMock];

const STORAGE_KEY = 'print-admin-products-store';

function readStore(): Product[] {
  if (typeof window === 'undefined') return productsStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return productsStore;
    const parsed = JSON.parse(raw) as Product[];
    return Array.isArray(parsed) && parsed.length ? parsed : productsStore;
  } catch {
    return productsStore;
  }
}

function writeStore(next: Product[]) {
  productsStore = next;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

const wait = async () => new Promise((resolve) => setTimeout(resolve, 80));

function makeSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createProductFromForm(payload: ProductFormValues): Product {
  const id = `p-${Math.floor(Math.random() * 9000 + 1000)}`;
  const name = payload.name.trim();
  const now = new Date();
  const iso = now.toISOString();

  return {
    id,
    sortOrder: productsStore.length + 1,
    slug: makeSlug(name),
    name,
    description: '',
    productType: payload.productType,
    creationMethod: payload.creationMethod,
    categoryId: payload.categoryId,
    vendorId: '',
    hotFolder: '',
    pdfFileUrl:
      payload.creationMethod === 'idml'
        ? payload.idmlFileName
        : payload.creationMethod === 'print-editor-template'
          ? payload.printEditorTemplateName
          : undefined,
    pages: Number(payload.pages) || 1,
    units: payload.units || 'mm',
    width: Number(payload.width) || 0,
    height: Number(payload.height) || 0,
    bleed: Number(payload.bleed) || 0,
    cmsPageLink: `/products/${makeSlug(name)}`,
    previewUrl: `/products/${id}`,
    status: 'draft',
    published: false,
    isGlobal: false,
    storefrontIds: [],
    channelIds: [],
    thumbnail: `https://placehold.co/96x96/111827/ffffff?text=${encodeURIComponent(name.slice(0, 2).toUpperCase() || 'NP')}`,
    lastSavedAt: iso,
    productNumbers: {
      itemNumber: `ITM-${id.toUpperCase()}`,
      modelNumber: `MOD-${id.toUpperCase()}`,
      integrationId: ''
    },
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
      defaultFont: 'Inter',
      toggles: [{ key: 'Snap to grid', enabled: true }],
      rules: []
    },
    templateSetup: {
      setupProfile: 'default',
      allowUpload: true,
      allowLayers: true,
      smartSnapping: true,
      bleedLocked: false,
      showSafeArea: true
    },
    templateAssets: { fonts: ['Inter'], layouts: [], themes: [], cliparts: [] },
    priceMapping: {
      basePrice: calculateProductEstimate(Number(payload.quantity) || 250, payload.materialId || 'silk-350', payload.finishId || 'matt-lam', payload.printerId || 'hp-indigo-7k', payload.turnaround || 'standard').total,
      sizeLabel: payload.parametricSize || (payload.width && payload.height ? `${payload.width}x${payload.height}` : ''),
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
    comments: [],
    internalNotes: '',
    inventory: { onHandQuantity: 0, reorderQuantity: 0 },
    relatedProducts: [],
    attributes: [],
    alternateViews: [],
    updatedAt: iso.slice(0, 10),
    productSystem: {
      templateId: payload.templateId || 'business-cards',
      materialId: payload.materialId || 'silk-350',
      finishId: payload.finishId || 'matt-lam',
      printerId: payload.printerId || 'hp-indigo-7k',
      quantity: Number(payload.quantity) || 250,
      turnaround: payload.turnaround || 'standard',
      fieldValues: payload.configValues || {}
    }
  };
}

export const productsService = {
  listProducts: async (params: ProductListQuery = {}): Promise<PaginatedResponse<Product>> => {
    await wait();
    let items = [...readStore()];

    if (params.search) {
      const term = params.search.toLowerCase();
      items = items.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          product.slug.toLowerCase().includes(term) ||
          product.productNumbers.itemNumber.toLowerCase().includes(term) ||
          product.productNumbers.modelNumber.toLowerCase().includes(term)
      );
    }

    if (params.categoryId) {
      items = items.filter((product) => product.categoryId === params.categoryId);
    }

    if (params.vendorId) {
      items = items.filter((product) => product.vendorId === params.vendorId);
    }

    if (params.uncategorized) {
      items = items.filter((product) => !product.categoryId);
    }

    if (params.sortBy) {
      items.sort((a, b) => {
        const direction = params.sortDirection === 'asc' ? 1 : -1;
        if (params.sortBy === 'name') return a.name.localeCompare(b.name) * direction;
        if (params.sortBy === 'sortOrder') return (a.sortOrder - b.sortOrder) * direction;
        if (params.sortBy === 'updatedAt') return a.updatedAt.localeCompare(b.updatedAt) * direction;
        return a.lastSavedAt.localeCompare(b.lastSavedAt) * direction;
      });
    }

    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const start = (page - 1) * perPage;
    const paged = items.slice(start, start + perPage);

    return okPaginated(paged, {
      page,
      perPage,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / perPage))
    });
  },

  getProduct: async (id: string): Promise<ApiResponse<Product>> => {
    await wait();
    const product = readStore().find((item) => item.id === id);
    if (!product) throw new Error('Product not found');
    return ok(product);
  },

  createProduct: async (payload: ProductFormValues): Promise<ApiResponse<Product>> => {
    await wait();
    const created = createProductFromForm(payload);
    writeStore([created, ...readStore()]);
    return ok(created);
  },

  updateProduct: async (id: string, changes: Partial<Product>): Promise<ApiResponse<Product>> => {
    await wait();
    const current = readStore().find((item) => item.id === id);
    if (!current) throw new Error('Product not found');

    const updated: Product = {
      ...current,
      ...changes,
      productNumbers: { ...current.productNumbers, ...changes.productNumbers },
      templateDefaults: { ...current.templateDefaults, ...changes.templateDefaults },
      templateSetup: { ...current.templateSetup, ...changes.templateSetup },
      templateAssets: { ...current.templateAssets, ...changes.templateAssets },
      priceMapping: { ...current.priceMapping, ...changes.priceMapping },
      inventory: { ...current.inventory, ...changes.inventory },
      lastSavedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    writeStore(readStore().map((item) => (item.id === id ? updated : item))); 
    return ok(updated);
  },

  deleteProduct: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    await wait();
    writeStore(readStore().filter((item) => item.id !== id));
    return ok({ success: true });
  },

  cloneProduct: async (id: string): Promise<ApiResponse<Product>> => {
    await wait();
    const product = readStore().find((item) => item.id === id);
    if (!product) throw new Error('Product not found');
    const cloned: Product = {
      ...product,
      id: `p-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: `${product.name} Copy`,
      slug: makeSlug(`${product.name} copy`),
      productNumbers: {
        ...product.productNumbers,
        itemNumber: `${product.productNumbers.itemNumber}-COPY`
      },
      lastSavedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    writeStore([cloned, ...readStore()]);
    return ok(cloned);
  },

  getProductAttributes: async (id: string): Promise<ApiResponse<{ items: ProductAttribute[] }>> => {
    const product = await productsService.getProduct(id);
    return ok({ items: product.data.attributes });
  },

  getRelatedProducts: async (id: string): Promise<ApiResponse<{ items: RelatedProduct[] }>> => {
    const product = await productsService.getProduct(id);
    return ok({ items: product.data.relatedProducts });
  },

  getProductComments: async (id: string): Promise<ApiResponse<{ items: ProductComment[] }>> => {
    const product = await productsService.getProduct(id);
    return ok({ items: product.data.comments });
  },

  getProductInventory: async (id: string): Promise<ApiResponse<ProductInventory>> => {
    const product = await productsService.getProduct(id);
    return ok(product.data.inventory);
  },

  listProductTags: async (): Promise<ApiResponse<{ items: ProductTag[] }>> => {
    await wait();
    const seen = new Map<string, ProductTag>();
    readStore().flatMap((item) => item.tags).forEach((tag) => seen.set(tag.id, tag));
    return ok({ items: Array.from(seen.values()) });
  }
};
