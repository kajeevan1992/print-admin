import type { EntityStatus, Id } from '@/types/common';
import type { ListQueryParams } from '@/services/api/types';

export type ProductStatus = EntityStatus;
export type ProductType = 'templated' | 'blank' | 'hybrid';

export type ProductNumbering = {
  itemNumber: string;
  modelNumber: string;
  integrationId: string;
};

export type ProductTemplateDefaults = {
  scaleFactor: number;
  zoomState: 'fit' | 'fill' | 'custom';
  editorMode: 'simple' | 'advanced';
  trimMode: 'safe' | 'full-bleed';
  rotate: number;
  imageMode: 'cover' | 'contain';
  colorSpace: 'CMYK' | 'RGB';
  templateType: 'marketing' | 'catalog' | 'packaging';
};

export type ProductTemplateSetup = {
  productsPanel: boolean;
  uploadPhotos: boolean;
  imagePanel: boolean;
  imageSearch: boolean;
  layersPanel: boolean;
  socialImageImport: boolean;
  addTextButton: boolean;
  restrictNewItem: boolean;
};

export type ProductPriceMapping = {
  basePrice: number;
  sizeLabel: string;
  currency: 'USD';
};

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
  values: string[];
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
  slug: string;
  name: string;
  description: string;
  productType: ProductType;
  categoryId: Id;
  vendorId: Id;
  pages: number;
  units: string;
  width: number;
  height: number;
  bleed: number;
  status: ProductStatus;
  published: boolean;
  isGlobal: boolean;
  channelIds?: Id[];
  thumbnail: string;
  productNumbers: ProductNumbering;
  templateDefaults: ProductTemplateDefaults;
  templateSetup: ProductTemplateSetup;
  priceMapping: ProductPriceMapping;
  tags: ProductTag[];
  comments: ProductComment[];
  inventory: ProductInventory[];
  relatedProducts: RelatedProduct[];
  updatedAt: string;
};

export type ProductFormValues = {
  creationMode: 'templated' | 'blank';
  name: string;
  slug: string;
  description: string;
  productType: ProductType;
  categoryId: Id;
  vendorId: Id;
  pages: string;
  units: string;
  width: string;
  height: string;
  bleed: string;
};

export type ProductListFilters = {
  search?: string;
  categoryId?: string;
  vendorId?: string;
  published?: boolean;
  isGlobal?: boolean;
};

export type ProductSortBy = 'name' | 'updatedAt' | 'status';

export type ProductListQuery = ListQueryParams<ProductSortBy, ProductListFilters>;
