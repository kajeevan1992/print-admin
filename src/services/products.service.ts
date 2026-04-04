import { productsMock } from '@/data/products';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type {
  AlternateView,
  Product,
  ProductAttribute,
  ProductComment,
  ProductCreateInput,
  ProductInventory,
  ProductListQuery,
  RelatedProduct
} from '@/modules/products/types';

const db: Product[] = structuredClone(productsMock);

const nowIso = () => new Date().toISOString();
const today = () => nowIso().slice(0, 10);
const id = (prefix: string) => `${prefix}-${Math.floor(Math.random() * 100000)}`;
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const refreshComputed = (product: Product): Product => ({
  ...product,
  commentsSummary: product.comments.length,
  lastSavedAt: `${today()} ${new Date().toISOString().slice(11, 16)} UTC`,
  updatedAt: today(),
  actionState: {
    canPreview: product.published,
    canOpenPrintEditor: product.productType === 'online',
    canDownloadPdf: product.productType === 'static' || Boolean(product.pdfFileUrl)
  }
});

const filterProducts = (items: Product[], query: ProductListQuery): Product[] => {
  let output = [...items];

  if (query.search) {
    const text = query.search.toLowerCase();
    output = output.filter((product) =>
      [product.name, product.slug, product.productNumbers.itemNumber, product.productNumbers.modelNumber]
        .some((value) => value.toLowerCase().includes(text))
    );
  }

  if (query.categoryId) output = output.filter((product) => product.categoryId === query.categoryId);
  if (query.vendorId) output = output.filter((product) => product.vendorId === query.vendorId);

  if (query.published === 'published') output = output.filter((product) => product.published);
  if (query.published === 'draft') output = output.filter((product) => !product.published);

  if (query.global === 'global') output = output.filter((product) => product.isGlobal);
  if (query.global === 'channel') output = output.filter((product) => !product.isGlobal);

  if (query.uncategorized) output = output.filter((product) => !product.categoryId);

  return output;
};

export const productsService = {
  listProducts: async (query: ProductListQuery = {}): Promise<PaginatedResponse<Product>> => {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const filtered = filterProducts(db.map(refreshComputed), query);

    return okPaginated(filtered.slice((page - 1) * perPage, page * perPage), {
      page,
      perPage,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / perPage))
    });
  },

  getProduct: async (productId: string): Promise<ApiResponse<Product>> => {
    const item = db.find((product) => product.id === productId);
    if (!item) throw new Error('Product not found');
    return ok(refreshComputed(item));
  },

  getProductById: async (productId: string): Promise<ApiResponse<Product>> => productsService.getProduct(productId),

  createProduct: async (payload: ProductCreateInput): Promise<ApiResponse<Product>> => {
    const product: Product = refreshComputed({
      id: id('p'),
      slug: slugify(payload.name),
      sortOrder: db.length * 10 + 10,
      name: payload.name,
      description: '',
      thumbnail: 'https://placehold.co/100x100/111827/ffffff?text=NEW',
      previewUrl: '',
      cmsPageLink: `/products/${slugify(payload.name)}`,
      commentsSummary: 0,
      lastSavedAt: nowIso(),
      published: false,
      isGlobal: false,
      storefrontAssignments: [],
      channelIds: [],
      categoryId: payload.categoryId,
      vendorId: '',
      hotFolder: '',
      productType: payload.productType,
      creationMethod: payload.creationMethod,
      status: 'draft',
      pdfFileName: payload.idmlFileName || payload.printEditorTemplateFileName,
      pdfFileUrl: '',
      pages: payload.pages ?? 1,
      units: payload.units ?? 'mm',
      width: payload.width ?? 0,
      height: payload.height ?? 0,
      bleed: payload.bleed ?? 0,
      productNumbers: { itemNumber: '', modelNumber: '', integrationId: '' },
      priceMapping: {
        basePrice: 0,
        sizeLabel: '',
        dielineMapping: '',
        currency: 'USD',
        parametric: payload.parametric
      },
      templateDefaults: {
        scaleFactor: 1,
        zoomState: 'fit',
        palette: 'Default',
        colorSpace: 'CMYK',
        editorMode: 'guided',
        textModes: ['point'],
        imageMode: 'contain',
        previewType: '2D',
        photoGroup: 'Default',
        model3d: '',
        defaultFont: ''
      },
      templateSetup: {
        showToolbar: true,
        showLayersPanel: false,
        showRulesPanel: true,
        lockBleed: false,
        rulesEngine: 'print-core-default'
      },
      templateAssets: { fonts: [], layouts: [], themes: [], cliparts: [] },
      attributes: [],
      comments: [],
      relatedProducts: [],
      alternateViews: [],
      inventory: { onHandQuantity: 0, reorderQuantity: 0 },
      tags: [],
      actionState: { canPreview: false, canOpenPrintEditor: payload.productType === 'online', canDownloadPdf: payload.productType === 'static' },
      updatedAt: today()
    });

    db.unshift(product);
    return ok(product);
  },

  updateProduct: async (productId: string, changes: Partial<Product>): Promise<ApiResponse<Product>> => {
    const idx = db.findIndex((product) => product.id === productId);
    if (idx === -1) throw new Error('Product not found');
    db[idx] = refreshComputed({ ...db[idx], ...changes });
    return ok(db[idx]);
  },

  cloneProduct: async (productId: string): Promise<ApiResponse<Product>> => {
    const original = db.find((product) => product.id === productId);
    if (!original) throw new Error('Product not found');

    const clone = refreshComputed({
      ...original,
      id: id('p'),
      name: `${original.name} (Copy)`,
      slug: `${original.slug}-copy`,
      status: 'draft',
      published: false
    });

    db.unshift(clone);
    return ok(clone);
  },

  deleteProduct: async (productId: string): Promise<ApiResponse<{ success: boolean }>> => {
    const idx = db.findIndex((product) => product.id === productId);
    if (idx !== -1) db.splice(idx, 1);
    return ok({ success: true });
  },

  getProductAttributes: async (productId: string): Promise<ApiResponse<{ items: ProductAttribute[] }>> => {
    const product = db.find((item) => item.id === productId);
    return ok({ items: product?.attributes ?? [] });
  },

  addProductAttribute: async (productId: string, payload: Omit<ProductAttribute, 'id'>): Promise<ApiResponse<ProductAttribute>> => {
    const product = db.find((item) => item.id === productId);
    if (!product) throw new Error('Product not found');
    const created: ProductAttribute = { id: id('attr'), ...payload };
    product.attributes = [...product.attributes, created];
    return ok(created);
  },

  removeProductAttribute: async (productId: string, attributeId: string): Promise<ApiResponse<{ success: boolean }>> => {
    const product = db.find((item) => item.id === productId);
    if (product) product.attributes = product.attributes.filter((item) => item.id !== attributeId);
    return ok({ success: true });
  },

  getRelatedProducts: async (productId: string): Promise<ApiResponse<{ items: RelatedProduct[] }>> => {
    const product = db.find((item) => item.id === productId);
    return ok({ items: product?.relatedProducts ?? [] });
  },

  addRelatedProduct: async (productId: string, related: RelatedProduct): Promise<ApiResponse<RelatedProduct>> => {
    const product = db.find((item) => item.id === productId);
    if (!product) throw new Error('Product not found');
    product.relatedProducts = [...product.relatedProducts.filter((item) => item.id !== related.id), related];
    return ok(related);
  },

  removeRelatedProduct: async (productId: string, relatedId: string): Promise<ApiResponse<{ success: boolean }>> => {
    const product = db.find((item) => item.id === productId);
    if (product) product.relatedProducts = product.relatedProducts.filter((item) => item.id !== relatedId);
    return ok({ success: true });
  },

  getProductComments: async (productId: string): Promise<ApiResponse<{ items: ProductComment[] }>> => {
    const product = db.find((item) => item.id === productId);
    return ok({ items: product?.comments ?? [] });
  },

  addProductComment: async (productId: string, message: string): Promise<ApiResponse<ProductComment>> => {
    const product = db.find((item) => item.id === productId);
    if (!product) throw new Error('Product not found');
    const comment: ProductComment = { id: id('cm'), author: 'Admin User', timestamp: `${today()} ${new Date().toISOString().slice(11, 16)} UTC`, message };
    product.comments = [comment, ...product.comments];
    return ok(comment);
  },

  getAlternateViews: async (productId: string): Promise<ApiResponse<{ items: AlternateView[] }>> => {
    const product = db.find((item) => item.id === productId);
    return ok({ items: product?.alternateViews ?? [] });
  },

  addAlternateView: async (productId: string, payload: Omit<AlternateView, 'id'>): Promise<ApiResponse<AlternateView>> => {
    const product = db.find((item) => item.id === productId);
    if (!product) throw new Error('Product not found');
    const created: AlternateView = { id: id('view'), ...payload };
    product.alternateViews = [...product.alternateViews, created];
    return ok(created);
  },

  removeAlternateView: async (productId: string, viewId: string): Promise<ApiResponse<{ success: boolean }>> => {
    const product = db.find((item) => item.id === productId);
    if (product) product.alternateViews = product.alternateViews.filter((item) => item.id !== viewId);
    return ok({ success: true });
  },

  getProductInventory: async (productId: string): Promise<ApiResponse<{ item: ProductInventory }>> => {
    const product = db.find((item) => item.id === productId);
    return ok({ item: product?.inventory ?? { onHandQuantity: 0, reorderQuantity: 0 } });
  }
};
