import { productAttributesMock, productsMock } from '@/data/products';
import type { Product, ProductFormValues } from '@/modules/products/types';

let productsStore: Product[] = [...productsMock];

export const productsService = {
  getProducts: async () => productsStore,

  getProductById: async (id: string) => productsStore.find((product) => product.id === id) ?? null,

  getProductAttributes: async () => productAttributesMock,

  createProduct: async (payload: ProductFormValues) => {
    const newProduct: Product = {
      id: `p-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: payload.name,
      category: payload.category,
      vendor: 'BlueLine Print',
      sku: `${payload.category.slice(0, 3).toUpperCase()}-NEW`,
      price: 0,
      published: false,
      global: false,
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    productsStore = [newProduct, ...productsStore];
    return newProduct;
  },

  updateProduct: async (id: string, changes: Partial<Product>) => {
    productsStore = productsStore.map((product) => (product.id === id ? { ...product, ...changes } : product));
    return productsStore.find((product) => product.id === id) ?? null;
  }
};
