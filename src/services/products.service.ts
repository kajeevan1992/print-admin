import { productAttributesMock } from '@/data/products';
import { http } from '@/services/api/http';
import type { Product, ProductAttribute, ProductFormValues } from '@/modules/products/types';

type BackendEnvelope<T> = { success: boolean; data: T };
type BackendProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  productType: string;
  categoryId: string;
  vendorId: string;
  isGlobal: boolean;
  published: boolean;
  createdAt?: string;
  updatedAt: string;
  channels?: Array<{ channelId?: string }>;
};

type BackendListData<T> = { items: T[]; pagination?: { page: number; limit?: number; total: number; totalPages?: number } };

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const titleCase = (value: string) =>
  value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const mapProduct = (raw: BackendProduct): Product => ({
  id: raw.id,
  name: raw.name,
  category: titleCase(raw.categoryId ?? 'Uncategorized'),
  vendor: titleCase(raw.vendorId ?? 'Unknown Vendor'),
  sku: raw.slug?.toUpperCase().replace(/-/g, '_') ?? raw.id,
  price: 0,
  published: Boolean(raw.published),
  global: Boolean(raw.isGlobal),
  updatedAt: String(raw.updatedAt ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
  slug: raw.slug,
  description: raw.description ?? '',
  productType: raw.productType ?? 'standard',
  status: raw.published ? 'active' : 'draft',
  channelIds: Array.isArray(raw.channels)
    ? raw.channels.map((item) => item.channelId).filter((value): value is string => Boolean(value))
    : []
});

export const productsService = {
  getProducts: async (): Promise<Product[]> => {
    const response = await http.get<BackendEnvelope<BackendListData<BackendProduct>>>('/products');
    return (response.data.items ?? []).map(mapProduct);
  },

  getProductById: async (id: string): Promise<Product | null> => {
    const response = await http.get<BackendEnvelope<BackendProduct>>(`/products/${id}`);
    return response?.data ? mapProduct(response.data) : null;
  },

  getProductAttributes: async (): Promise<ProductAttribute[]> => productAttributesMock,

  createProduct: async (payload: ProductFormValues): Promise<Product> => {
    const response = await http.post<BackendEnvelope<BackendProduct>>('/products', {
      name: payload.name,
      slug: slugify(payload.name),
      description: '',
      productType: 'standard',
      categoryId: slugify(payload.category),
      vendorId: 'general-vendor',
      isGlobal: false,
      published: false,
      channelIds: []
    });

    return mapProduct(response.data);
  },

  updateProduct: async (id: string, changes: Partial<Product>): Promise<Product | null> => {
    const body = {
      ...(changes.name !== undefined ? { name: changes.name } : {}),
      ...(changes.slug !== undefined ? { slug: changes.slug } : {}),
      ...(changes.description !== undefined ? { description: changes.description } : {}),
      ...(changes.productType !== undefined ? { productType: changes.productType } : {}),
      ...(changes.category !== undefined ? { categoryId: slugify(changes.category) } : {}),
      ...(changes.vendor !== undefined ? { vendorId: slugify(changes.vendor) } : {}),
      ...(changes.global !== undefined ? { isGlobal: changes.global } : {}),
      ...(changes.published !== undefined ? { published: changes.published } : {}),
      ...(changes.channelIds !== undefined ? { channelIds: changes.channelIds } : {})
    };

    const response = await http.patch<BackendEnvelope<BackendProduct>>(`/products/${id}`, body);
    return response?.data ? mapProduct(response.data) : null;
  }
};
