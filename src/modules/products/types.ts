import type { Id } from '@/types/common';

export type ProductStatus = 'draft' | 'active' | 'archived';
export type ProductType = 'templated' | 'blank' | 'hybrid';

export type ProductComment = {
  id: Id;
  author: string;
  timestamp: string;
  label: 'internal' | 'qa' | 'vendor';
  message: string;
};

export type ProductTag = {
  id: Id;
  label: string;
  color: 'blue' | 'violet' | 'emerald' | 'amber';
};

export type ProductInventory = {
  id: Id;
  sku: string;
  warehouse: string;
  quantity: number;
  reorderThreshold: number;
  availability: 'in-stock' | 'low' | 'out-of-stock';
};

export type ProductAttribute = {
  id: Id;
  name: string;
  type: 'select' | 'number' | 'text';
  required: boolean;
  values?: string[];
};

export type RelatedProduct = {
  id: Id;
  name: string;
  slug: string;
  category: string;
  thumbnail: string;
};

export type Product = {
  id: Id;
  name: string;
  category: string;
  vendor: string;
  sku: string;
  price: number;
  published: boolean;
  global: boolean;
  updatedAt: string;
  slug: string;
  description: string;
  productType: ProductType;
  status: ProductStatus;
  categoryId?: Id;
  vendorId?: Id;
  pages?: number;
  units?: string;
  width?: number;
  height?: number;
  bleed?: number;
  channelIds?: Id[];
  comments?: ProductComment[];
  tags?: ProductTag[];
  inventory?: ProductInventory[];
  relatedProducts?: RelatedProduct[];
};

export type ProductFormValues = {
  creationMode: 'templated' | 'blank';
  name: string;
  category: string;
  vendor: string;
  pages: string;
  units: string;
  width: string;
  height: string;
  bleed: string;
};
