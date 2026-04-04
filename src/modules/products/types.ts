import type { EntityStatus, Id } from '@/types/common';
import type { ListQueryParams } from '@/services/api/types';

export type ProductStatus = EntityStatus;
export type ProductType = 'static' | 'online';
export type CreationMethod = 'idml_template' | 'print_editor_template' | 'blank' | 'parametric_standard';

export type StorefrontAssignment = {
  storefrontId: Id;
  storefrontName: string;
};

export type ProductActionState = {
  canPreview: boolean;
  canOpenPrintEditor: boolean;
  canDownloadPdf: boolean;
};

export type ProductNumbering = {
  itemNumber: string;
  modelNumber: string;
  integrationId: string;
};

export type ParametricStandardConfig = {
  standard: string;
  size: string;
  allowance: string;
  material: string;
};

export type ProductPriceMapping = {
  basePrice: number;
  sizeLabel: string;
  dielineMapping: string;
  currency: 'USD';
  parametric?: ParametricStandardConfig;
};

export type ProductTemplateDefaults = {
  scaleFactor: number;
  zoomState: 'fit' | 'fill' | 'custom';
  palette: string;
  colorSpace: 'CMYK' | 'RGB';
  editorMode: 'guided' | 'advanced';
  textModes: string[];
  imageMode: 'cover' | 'contain';
  previewType: '2D' | '3D' | 'proof';
  photoGroup: string;
  model3d: string;
  defaultFont: string;
};

export type ProductTemplateSetup = {
  showToolbar: boolean;
  showLayersPanel: boolean;
  showRulesPanel: boolean;
  lockBleed: boolean;
  rulesEngine: string;
};

export type ProductTemplateAssets = {
  fonts: string[];
  layouts: string[];
  themes: string[];
  cliparts: string[];
};

export type ProductAttribute = {
  id: Id;
  type: string;
  value: string;
};

export type ProductComment = {
  id: Id;
  author: string;
  timestamp: string;
  message: string;
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

export type ProductInventory = {
  onHandQuantity: number;
  reorderQuantity: number;
};

export type ProductTag = {
  id: Id;
  label: string;
  color: 'blue' | 'violet' | 'emerald' | 'amber';
};

export type Product = {
  id: Id;
  slug: string;
  sortOrder: number;
  name: string;
  description: string;
  thumbnail: string;
  previewUrl: string;
  cmsPageLink: string;
  commentsSummary: number;
  lastSavedAt: string;
  published: boolean;
  isGlobal: boolean;
  storefrontAssignments: StorefrontAssignment[];
  channelIds?: Id[];
  categoryId: Id;
  vendorId: Id;
  hotFolder: string;
  productType: ProductType;
  creationMethod: CreationMethod;
  status: ProductStatus;
  pdfFileName?: string;
  pdfFileUrl?: string;
  pages: number;
  units: string;
  width: number;
  height: number;
  bleed: number;
  productNumbers: ProductNumbering;
  priceMapping: ProductPriceMapping;
  templateDefaults: ProductTemplateDefaults;
  templateSetup: ProductTemplateSetup;
  templateAssets: ProductTemplateAssets;
  attributes: ProductAttribute[];
  comments: ProductComment[];
  relatedProducts: RelatedProduct[];
  alternateViews: AlternateView[];
  inventory: ProductInventory;
  tags: ProductTag[];
  actionState: ProductActionState;
  updatedAt: string;
};

export type ProductListFilters = {
  search?: string;
  categoryId?: string;
  vendorId?: string;
  published?: 'all' | 'published' | 'draft';
  global?: 'all' | 'global' | 'channel';
  uncategorized?: boolean;
};

export type ProductSortBy = 'name' | 'updatedAt' | 'sortOrder' | 'lastSavedAt';

export type ProductListQuery = ListQueryParams<ProductSortBy, ProductListFilters>;

export type ProductCreateInput = {
  name: string;
  categoryId: string;
  creationMethod: CreationMethod;
  productType: ProductType;
  idmlFileName?: string;
  printEditorTemplateFileName?: string;
  pages?: number;
  units?: string;
  width?: number;
  height?: number;
  bleed?: number;
  parametric?: ParametricStandardConfig;
};
