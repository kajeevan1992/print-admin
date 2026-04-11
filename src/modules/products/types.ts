import type { EntityStatus, Id } from '@/types/common';
import type { ListQueryParams } from '@/services/api/types';

export type ProductStatus = EntityStatus;
export type ProductType = 'online' | 'static' | 'parametric';
export type CreationMethod = 'idml' | 'print-editor-template' | 'blank' | 'parametric-standard';

export type ProductNumbering = {
  itemNumber: string;
  modelNumber: string;
  integrationId: string;
};

export type ProductTemplateDefaults = {
  scaleFactor: number;
  zoomState: 'fit' | 'fill' | 'custom';
  palette: string;
  colorSpace: 'CMYK' | 'RGB';
  editorMode: 'simple' | 'advanced';
  textModes: string[];
  imageMode: 'cover' | 'contain';
  previewType: string;
  photoGroup: string;
  model3d: string;
  defaultFont: string;
  toggles: Array<{ key: string; enabled: boolean }>;
  rules: string[];
};

export type ProductTemplateAssets = {
  fonts: string[];
  layouts: string[];
  themes: string[];
  cliparts: string[];
};

export type ProductTemplateSetup = {
  setupProfile: string;
  allowUpload: boolean;
  allowLayers: boolean;
  smartSnapping: boolean;
  bleedLocked: boolean;
  showSafeArea: boolean;
};

export type ParametricStandardConfig = {
  standard: string;
  size: string;
  allowance: string;
  material: string;
};


export type ProductSystemConfig = {
  templateId: string;
  materialId: string;
  finishId: string;
  printerId: string;
  quantity: number;
  turnaround: 'standard' | 'priority' | 'rush';
  fieldValues: Record<string, string>;
};

export type ProductPriceMapping = {
  basePrice: number;
  sizeLabel: string;
  dielineMapping: string;
  currency: 'USD';
  parametricStandard?: ParametricStandardConfig;
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
  onHandQuantity: number;
  reorderQuantity: number;
};

export type ProductAttribute = {
  id: Id;
  type: string;
  value: string;
};

export type RelatedProduct = {
  id: Id;
  name: string;
  slug: string;
  thumbnail: string;
};

export type AlternateView = {
  id: Id;
  label: string;
  url: string;
};

export type Product = {
  id: Id;
  sortOrder: number;
  slug: string;
  name: string;
  description: string;
  productType: ProductType;
  creationMethod: CreationMethod;
  categoryId: Id;
  vendorId: Id;
  hotFolder: string;
  pdfFileUrl?: string;
  pages: number;
  units: string;
  width: number;
  height: number;
  bleed: number;
  cmsPageLink: string;
  previewUrl: string;
  status: ProductStatus;
  published: boolean;
  isGlobal: boolean;
  storefrontIds: Id[];
  channelIds?: Id[];
  thumbnail: string;
  lastSavedAt: string;
  productNumbers: ProductNumbering;
  templateDefaults: ProductTemplateDefaults;
  templateSetup: ProductTemplateSetup;
  templateAssets: ProductTemplateAssets;
  priceMapping: ProductPriceMapping;
  tags: ProductTag[];
  comments: ProductComment[];
  internalNotes: string;
  inventory: ProductInventory;
  relatedProducts: RelatedProduct[];
  attributes: ProductAttribute[];
  alternateViews: AlternateView[];
  updatedAt: string;
  productSystem?: ProductSystemConfig;
};

export type ProductFormValues = {
  name: string;
  categoryId: Id;
  creationMethod: CreationMethod;
  productType: ProductType;
  idmlFileName: string;
  printEditorTemplateName: string;
  pages: string;
  units: string;
  width: string;
  height: string;
  bleed: string;
  parametricStandard: string;
  parametricSize: string;
  parametricAllowance: string;
  parametricMaterial: string;
  templateId: string;
  materialId: string;
  finishId: string;
  printerId: string;
  quantity: string;
  turnaround: 'standard' | 'priority' | 'rush';
  configValues: Record<string, string>;
};

export type ProductListFilters = {
  search?: string;
  categoryId?: string;
  vendorId?: string;
  uncategorized?: boolean;
};

export type ProductSortBy = 'name' | 'updatedAt' | 'sortOrder' | 'lastSavedAt';

export type ProductListQuery = ListQueryParams<ProductSortBy, ProductListFilters>;
