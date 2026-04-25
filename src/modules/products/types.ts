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


export type ProductOptionDisplayType = 'dropdown' | 'radio' | 'image-cards' | 'checkboxes' | 'swatches' | 'quantity-grid' | 'custom-size' | 'info-cards';
export type ProductOptionSource = 'size' | 'material' | 'finish' | 'quantity' | 'turnaround' | 'custom';
export type PricingInputRole = 'none' | 'size' | 'material' | 'finish' | 'quantity' | 'sides' | 'turnaround' | 'width' | 'height' | 'area' | 'pages' | 'artwork' | 'custom';
export type PricingBasis = 'none' | 'fixed' | 'per-item' | 'per-sheet' | 'per-side' | 'per-sqm' | 'per-linear-metre' | 'percentage' | 'time-minutes';

export type ProductOptionValue = {
  id: Id;
  label: string;
  sourceId?: Id;
  description?: string;
  imageUrl?: string;
  width?: number;
  height?: number;
  unit?: string;
  quantity?: number;
  extraCostMinor?: number;
  leadTimeDays?: number;
  pricingKey?: string;
  dependencyKey?: string;
  swatchColor?: string;
  isDefault?: boolean;
  isHidden?: boolean;
  sortOrder?: number;
  productionCode?: string;
  pricingInputRole?: PricingInputRole;
  pricingBasis?: PricingBasis;
  pricingMultiplier?: number;
  setupCostMinor?: number;
  runCostMinor?: number;
  minChargeMinor?: number;
  pricingFormulaHint?: string;
  compatibleMaterialIds?: Id[];
  incompatibleMaterialIds?: Id[];
  compatibleFinishIds?: Id[];
  incompatibleFinishIds?: Id[];
  compatiblePrinterIds?: Id[];
  isCustomSizeTrigger?: boolean;
};

export type ProductDimensionMode = 'preset-only' | 'preset-and-custom' | 'custom-only';
export type ProductQuantityMode = 'fixed-list' | 'range-with-step';
export type ProductSheetFitMode = 'none' | 'sra3' | 'custom-sheet' | 'roll' | 'board';

export type ProductOptionGroup = {
  id: Id;
  name: string;
  key: string;
  source: ProductOptionSource;
  displayType: ProductOptionDisplayType;
  required: boolean;
  allowMultiple?: boolean;
  allowCustomSize?: boolean;
  dimensionMode?: ProductDimensionMode;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  increment?: number;
  sourceLimitMode?: 'manual' | 'material-printer';
  compatibilityMode?: 'none' | 'material-to-finish' | 'material-to-printer' | 'finish-to-material' | 'size-to-printer';
  pricingInputRole?: PricingInputRole;
  pricingBasis?: PricingBasis;
  pricingUnit?: string;
  pricingFormulaHint?: string;
  requiredCompatibleGroupKey?: string;
  sheetFitMode?: ProductSheetFitMode;
  sourceSheetWidth?: number;
  sourceSheetHeight?: number;
  maxUpsPerSheet?: number;
  unit?: string;
  quantityMode?: ProductQuantityMode;
  minQuantity?: number;
  maxQuantity?: number;
  quantityStep?: number;
  values: ProductOptionValue[];
  pricingKey?: string;
  defaultValueId?: Id;
  displayColumns?: number;
  hideDescriptions?: boolean;
  dependencyRules?: Array<{ id: Id; whenGroupKey: string; whenValueId: string; action: 'show' | 'hide' | 'require'; targetGroupKey?: string }>;
  helpText?: string;
  compatibilityNotes?: string;
};

export type ProductTemplateMergeMode = 'template-only' | 'merge-overrides' | 'product-only';

export type ProductArtworkRuleConfig = {
  allowedFileTypes: string[];
  minFiles: number;
  maxFiles: number;
  requiredPageCount?: number;
  bleedMm?: number;
  requirePdf?: boolean;
  allowDesignFromTemplate?: boolean;
  allowUploadArtwork?: boolean;
  uploadChoiceMode?: 'upload-only' | 'template-only' | 'upload-or-template';
  sizeMatchingMode?: 'match-selected-size' | 'any-print-ready-size' | 'manual-review';
  separateFilesMode?: 'single-file' | 'front-back-files' | 'cover-inner-files' | 'multi-page-pdf';
  minDpi?: number;
  maxFileSizeMb?: number;
  requireCutline?: boolean;
  cutlineLayerName?: string;
  allowedArtworkActions?: Array<'upload' | 'design-online' | 'request-design-help'>;
  customerInstructions?: string;
};

export type ProductTemplateRuleConfig = {
  templateKey: string;
  templateName: string;
  mergeMode: ProductTemplateMergeMode;
  pricingProfileKey?: string;
  productionMethod?: string;
  sourceSheetWidth?: number;
  sourceSheetHeight?: number;
  sourceSheetUnit?: string;
  maxPrintableWidth?: number;
  maxPrintableLength?: number;
  notes?: string;
  artworkRules: ProductArtworkRuleConfig;
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
  optionGroups?: ProductOptionGroup[];
  templateRules?: ProductTemplateRuleConfig;
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
