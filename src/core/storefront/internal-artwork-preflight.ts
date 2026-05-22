import { getInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import type { TenantContext } from '@/core/tenant/types';
import type { ProductArtworkRuleConfig, ProductModeSettings, ProductTemplateRuleConfig } from '@/modules/products/types';

type CatalogProduct = Record<string, any> & {
  id: string;
  slug?: string;
  name?: string;
  title?: string;
  metadataJson?: Record<string, any>;
  templateRules?: ProductTemplateRuleConfig;
  productModeSettings?: ProductModeSettings;
};

type ArtworkFileMeta = {
  name?: string;
  filename?: string;
  type?: string;
  mimeType?: string;
  size?: number;
  sizeBytes?: number;
  pageCount?: number;
  width?: number;
  height?: number;
  dpi?: number;
  hasBleed?: boolean;
  hasCutline?: boolean;
  cutlineLayerName?: string;
};

const defaultArtworkRules: ProductArtworkRuleConfig = {
  allowedFileTypes: ['pdf'],
  minFiles: 1,
  maxFiles: 1,
  bleedMm: 3,
  requirePdf: true,
  allowUploadArtwork: true,
  allowDesignFromTemplate: false,
  uploadChoiceMode: 'upload-only',
  sizeMatchingMode: 'manual-review',
  separateFilesMode: 'single-file',
  minDpi: 300,
  maxFileSizeMb: 100,
  allowedArtworkActions: ['upload', 'request-design-help'],
  customerInstructions: 'Upload print-ready artwork. PDF is preferred.'
};

function normaliseExt(value?: string) {
  return String(value || '').trim().replace(/^\./, '').toLowerCase();
}

function fileName(file: ArtworkFileMeta) {
  return String(file.name || file.filename || '').trim();
}

function fileExt(file: ArtworkFileMeta) {
  const name = fileName(file);
  const fromName = name.includes('.') ? name.split('.').pop() : '';
  const mime = String(file.type || file.mimeType || '').toLowerCase();
  if (fromName) return normaliseExt(fromName);
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('tiff')) return 'tif';
  return '';
}

function sizeMb(file: ArtworkFileMeta) {
  return Number(file.sizeBytes ?? file.size ?? 0) / 1024 / 1024;
}

async function loadProduct(ctx: TenantContext, idOrSlug?: string): Promise<CatalogProduct | null> {
  if (!idOrSlug) return null;
  const product = await getInternalCatalogRecord(ctx, 'products', idOrSlug) as CatalogProduct;
  const metadata = product.metadataJson || {};
  return {
    ...product,
    templateRules: product.templateRules || metadata.templateRules,
    productModeSettings: product.productModeSettings || metadata.productModeSettings,
  };
}

function artworkRulesFor(product: CatalogProduct | null) {
  return {
    ...defaultArtworkRules,
    ...(product?.templateRules?.artworkRules || {}),
    allowedFileTypes: product?.templateRules?.artworkRules?.allowedFileTypes?.length ? product.templateRules.artworkRules.allowedFileTypes : defaultArtworkRules.allowedFileTypes,
  };
}

function modeMessages(product: CatalogProduct | null) {
  const mode = product?.productModeSettings;
  const warnings: string[] = [];
  const blockers: string[] = [];
  if (mode?.quote?.enabled && mode.quote.allowArtworkUploadBeforeQuote === false) {
    blockers.push('Artwork upload before quote approval is disabled for this product.');
  }
  if (mode?.supplier?.enabled && mode.supplier.useSupplierArtworkSpec) {
    warnings.push('Supplier artwork specification is enabled. Check supplier-specific artwork requirements before production.');
  }
  if (mode?.quote?.enabled && mode.quote.requireManualApproval) {
    warnings.push('This product requires manual quote/artwork approval before production.');
  }
  return { warnings, blockers };
}

function validateFiles(files: ArtworkFileMeta[], rules: ProductArtworkRuleConfig) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const accepted = (rules.allowedFileTypes || []).map(normaliseExt).filter(Boolean);
  const fileCount = files.length;

  if (fileCount < Number(rules.minFiles || 0)) errors.push(`Upload at least ${rules.minFiles} file(s).`);
  if (rules.maxFiles && fileCount > rules.maxFiles) errors.push(`Upload no more than ${rules.maxFiles} file(s).`);

  files.forEach((file, index) => {
    const label = fileName(file) || `File ${index + 1}`;
    const ext = fileExt(file);
    if (accepted.length && !accepted.includes(ext)) errors.push(`${label}: file type .${ext || 'unknown'} is not allowed. Allowed: ${accepted.join(', ')}.`);
    if (rules.requirePdf && ext !== 'pdf') errors.push(`${label}: PDF artwork is required for this product.`);
    if (rules.maxFileSizeMb && sizeMb(file) > rules.maxFileSizeMb) errors.push(`${label}: file is larger than ${rules.maxFileSizeMb}MB.`);
    if (rules.requiredPageCount && file.pageCount && Number(file.pageCount) !== Number(rules.requiredPageCount)) errors.push(`${label}: expected ${rules.requiredPageCount} page(s), detected ${file.pageCount}.`);
    if (rules.minDpi && file.dpi && Number(file.dpi) < Number(rules.minDpi)) errors.push(`${label}: artwork DPI is below ${rules.minDpi}.`);
    if (rules.bleedMm && file.hasBleed === false) warnings.push(`${label}: ${rules.bleedMm}mm bleed is recommended/required.`);
    if (rules.requireCutline && !file.hasCutline) errors.push(`${label}: cutline layer is required${rules.cutlineLayerName ? ` (${rules.cutlineLayerName})` : ''}.`);
    if (rules.requireCutline && file.cutlineLayerName && rules.cutlineLayerName && file.cutlineLayerName !== rules.cutlineLayerName) warnings.push(`${label}: expected cutline layer name ${rules.cutlineLayerName}.`);
  });

  return { errors, warnings };
}

export async function resolveArtworkPreflight(ctx: TenantContext, input: Record<string, any>) {
  const productId = String(input.productId || input.slug || input.productSlug || '').trim();
  const product = await loadProduct(ctx, productId).catch(() => null);
  const rules = artworkRulesFor(product);
  const rawFiles = Array.isArray(input.files) ? input.files : input.file ? [input.file] : [];
  const files = rawFiles.map((file: ArtworkFileMeta) => ({ ...file }));
  const validation = validateFiles(files, rules);
  const mode = modeMessages(product);
  const errors = [...mode.blockers, ...validation.errors];
  const warnings = [...mode.warnings, ...validation.warnings];
  const status = errors.length ? 'blocked' : warnings.length ? 'warning' : 'passed';

  return {
    ok: true,
    source: 'internal-storefront-artwork-preflight',
    product: product ? {
      id: product.id,
      slug: product.slug,
      name: product.name || product.title,
    } : null,
    artworkRules: rules,
    preflight: {
      status,
      passed: !errors.length,
      requiresManualReview: Boolean(warnings.length || product?.productModeSettings?.quote?.requireManualApproval || rules.sizeMatchingMode === 'manual-review'),
      errors,
      warnings,
      acceptedFileTypes: rules.allowedFileTypes,
      customerInstructions: rules.customerInstructions,
      uploadChoiceMode: rules.uploadChoiceMode,
      separateFilesMode: rules.separateFilesMode,
      sizeMatchingMode: rules.sizeMatchingMode,
      maxFileSizeMb: rules.maxFileSizeMb,
      minDpi: rules.minDpi,
      bleedMm: rules.bleedMm,
      requirePdf: Boolean(rules.requirePdf),
      requireCutline: Boolean(rules.requireCutline),
      cutlineLayerName: rules.cutlineLayerName || null,
    },
    files: files.map((file) => ({
      name: fileName(file),
      extension: fileExt(file),
      sizeMb: Number(sizeMb(file).toFixed(2)),
      pageCount: file.pageCount,
      dpi: file.dpi,
    })),
  };
}
