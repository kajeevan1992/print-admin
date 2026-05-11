import { getInternalCatalogRecord, listInternalCatalog, writeInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const PRODUCT_RESOURCE = 'products' as const;

type Store = Record<string, any>;
type Severity = 'error' | 'warning' | 'recommendation';

type ReadinessIssue = {
  code: string;
  message: string;
  field: string;
  severity: Severity;
  section: string;
};

function issue(code: string, message: string, field: string, severity: Severity = 'error', section = 'general'): ReadinessIssue {
  return { code, message, field, severity, section };
}

function metadata(product: Store) {
  return product?.metadataJson && typeof product.metadataJson === 'object' ? product.metadataJson : {};
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value as Store).length > 0;
  return value !== undefined && value !== null && value !== '';
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normaliseProduct(raw: Store) {
  const meta = metadata(raw);
  const optionGroups = arrayValue(meta.optionGroups).length ? arrayValue(meta.optionGroups) : arrayValue(meta.options);
  const deliveryServices = arrayValue(meta.delivery?.services).length ? arrayValue(meta.delivery.services) : arrayValue(meta.turnaroundOptions);
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name || raw.title,
    status: meta.status || (raw.isActive ? 'published' : 'draft'),
    categoryId: raw.categoryId || null,
    productType: raw.productType || meta.template || meta.productType,
    priceFromMinor: Number(raw.priceFromMinor || meta.priceFromMinor || meta.pricing?.priceFromMinor || 0),
    currency: raw.currency || meta.currency || 'GBP',
    vatRate: meta.vatRate || meta.vatType || meta.pricing?.vatRate || 'standard',
    artworkRequired: meta.artworkRequired !== false,
    optionGroups,
    selectorUi: meta.selectorUi || {},
    deliveryServices,
    pricing: meta.pricing || {},
    printMaths: meta.printMaths || {},
    finishing: arrayValue(meta.finishing),
    supplierPricing: meta.supplierPricing || {},
    rules: arrayValue(meta.rules),
    artwork: meta.artwork || {},
    artworkRules: meta.artworkRules || {},
    productionConstraints: meta.productionConstraints || {},
    media: meta.media || {},
    content: meta.content || {},
    designServices: arrayValue(meta.designServices),
    storefront: meta.storefront || {},
    checkout: meta.checkout || {},
    metadataJson: meta,
  };
}

function validateOptionGroups(item: Store, issues: ReadinessIssue[]) {
  if (!item.optionGroups.length) {
    issues.push(issue('OPTION_GROUPS_REQUIRED', 'Add at least one option group for the storefront configurator.', 'metadataJson.optionGroups', 'error', 'options'));
    return;
  }
  for (const group of item.optionGroups) {
    if (!group.id) issues.push(issue('OPTION_GROUP_ID_REQUIRED', 'Every option group needs an id.', 'metadataJson.optionGroups[].id', 'error', 'options'));
    if (!group.label) issues.push(issue('OPTION_GROUP_LABEL_REQUIRED', `Option group ${group.id || 'unknown'} needs a customer label.`, 'metadataJson.optionGroups[].label', 'warning', 'options'));
    if (!group.selector) issues.push(issue('SELECTOR_TYPE_REQUIRED', `Option group ${group.label || group.id} needs a selector UI type.`, 'metadataJson.optionGroups[].selector', 'error', 'options'));
    if (!['number', 'custom-size'].includes(group.selector) && !arrayValue(group.values).length) {
      issues.push(issue('OPTION_VALUES_REQUIRED', `Option group ${group.label || group.id} needs values.`, 'metadataJson.optionGroups[].values', 'error', 'options'));
    }
    for (const value of arrayValue(group.values)) {
      if (!value.id) issues.push(issue('OPTION_VALUE_ID_REQUIRED', `A value in ${group.label || group.id} is missing an id.`, 'metadataJson.optionGroups[].values[].id', 'error', 'options'));
      if (!value.label) issues.push(issue('OPTION_VALUE_LABEL_REQUIRED', `A value in ${group.label || group.id} is missing a label.`, 'metadataJson.optionGroups[].values[].label', 'warning', 'options'));
    }
  }
  if (!item.selectorUi.version) issues.push(issue('SELECTOR_UI_VERSION_MISSING', 'Selector UI contract/version is missing.', 'metadataJson.selectorUi.version', 'warning', 'options'));
}

function validateRules(item: Store, issues: ReadinessIssue[]) {
  for (const rule of item.rules) {
    if (!rule.id) issues.push(issue('RULE_ID_REQUIRED', 'Every product rule needs an id.', 'metadataJson.rules[].id', 'error', 'rules'));
    if (!arrayValue(rule.when).length) issues.push(issue('RULE_CONDITIONS_REQUIRED', `Rule ${rule.name || rule.id || 'unknown'} has no IF conditions.`, 'metadataJson.rules[].when', 'warning', 'rules'));
    if (!arrayValue(rule.actions).length) issues.push(issue('RULE_ACTIONS_REQUIRED', `Rule ${rule.name || rule.id || 'unknown'} has no THEN actions.`, 'metadataJson.rules[].actions', 'warning', 'rules'));
  }
  if (item.rules.length && !item.metadataJson.rulesVersion) issues.push(issue('RULES_VERSION_MISSING', 'Rules exist but rulesVersion is missing.', 'metadataJson.rulesVersion', 'warning', 'rules'));
}

function validatePricing(item: Store, issues: ReadinessIssue[]) {
  const mode = item.pricing.mode || item.pricing.source;
  if (!mode) issues.push(issue('PRICING_MODE_REQUIRED', 'Choose a pricing mode/source before publishing.', 'metadataJson.pricing.mode', 'error', 'pricing'));
  if (!item.priceFromMinor || item.priceFromMinor <= 0) issues.push(issue('PRICE_FROM_REQUIRED', 'Price from must be greater than zero.', 'priceFromMinor', 'error', 'pricing'));
  if (!['zero', 'standard', 'reduced', 'exempt', 'mixed', '0', '20'].includes(String(item.vatRate))) {
    issues.push(issue('VAT_RATE_REQUIRED', 'VAT type must be standard, zero-rated, mixed, reduced or exempt.', 'metadataJson.vatRate', 'error', 'pricing'));
  }
  if (mode === 'matrix' && !arrayValue(item.pricing.matrixRows).length) issues.push(issue('MATRIX_ROWS_REQUIRED', 'Matrix pricing mode needs matrix rows.', 'metadataJson.pricing.matrixRows', 'error', 'pricing'));
  if (['sheet-cost', 'booklet'].includes(mode) && !item.printMaths.sheetSize) issues.push(issue('SHEET_SIZE_REQUIRED', 'Sheet/booklet pricing needs a sheet size such as SRA3.', 'metadataJson.printMaths.sheetSize', 'error', 'pricing'));
  if (['sheet-cost', 'booklet'].includes(mode) && !Number(item.printMaths.upsPerSheet || 0)) issues.push(issue('UPS_PER_SHEET_REQUIRED', 'Sheet/booklet pricing should define ups per sheet.', 'metadataJson.printMaths.upsPerSheet', 'warning', 'pricing'));
  if (mode === 'area' && !Number(item.printMaths.areaRateMinor || 0)) issues.push(issue('AREA_RATE_REQUIRED', 'Area pricing needs a square-metre rate.', 'metadataJson.printMaths.areaRateMinor', 'error', 'pricing'));
  if (mode === 'supplier-api' && item.supplierPricing.mode === 'off') issues.push(issue('SUPPLIER_MODE_REQUIRED', 'Supplier API pricing mode needs supplierPricing enabled.', 'metadataJson.supplierPricing.mode', 'error', 'pricing'));
  if (item.vatRate === 'mixed' && !item.designServices.length && !item.finishing.some((row: Store) => row.vatRate)) {
    issues.push(issue('MIXED_VAT_DETAILS_REQUIRED', 'Mixed VAT needs VAT-rated services/finishing lines configured.', 'metadataJson.designServices', 'warning', 'pricing'));
  }
}

function validateArtworkAndProduction(item: Store, issues: ReadinessIssue[]) {
  if (item.artworkRequired) {
    if (!arrayValue(item.artwork.acceptedFiles).length && !arrayValue(item.artworkRules.fileTypes).length) issues.push(issue('ARTWORK_FILE_TYPES_REQUIRED', 'Artwork-required products need accepted file types.', 'metadataJson.artwork.acceptedFiles', 'error', 'artwork'));
    if (!Number(item.artworkRules.bleedMm ?? item.artwork.bleedMm ?? 0)) issues.push(issue('BLEED_REQUIRED', 'Artwork rules should define bleed in mm.', 'metadataJson.artworkRules.bleedMm', 'warning', 'artwork'));
    if (!Number(item.artworkRules.minDpi || 0)) issues.push(issue('DPI_REQUIRED', 'Artwork rules should define minimum DPI.', 'metadataJson.artworkRules.minDpi', 'warning', 'artwork'));
    if (!item.artworkRules.colourMode) issues.push(issue('COLOUR_MODE_REQUIRED', 'Artwork rules should define colour mode policy.', 'metadataJson.artworkRules.colourMode', 'warning', 'artwork'));
  }
  const constraints = item.productionConstraints || {};
  if (!arrayValue(constraints.machines).length) issues.push(issue('MACHINE_CONSTRAINTS_REQUIRED', 'Add compatible machine constraints for production routing.', 'metadataJson.productionConstraints.machines', 'warning', 'production'));
  if (!arrayValue(constraints.materials).length) issues.push(issue('MATERIAL_CONSTRAINTS_REQUIRED', 'Add material compatibility constraints.', 'metadataJson.productionConstraints.materials', 'warning', 'production'));
  if (constraints.sizeLimitMode === 'machine-width' && !Number(constraints.maxRollWidthMm || 0)) issues.push(issue('ROLL_WIDTH_REQUIRED', 'Machine-width size limit needs max roll width.', 'metadataJson.productionConstraints.maxRollWidthMm', 'error', 'production'));
  if (constraints.allowPanelJoin && !constraints.panelJoinMessage) issues.push(issue('PANEL_JOIN_MESSAGE_REQUIRED', 'Panel joins are allowed but no customer message is configured.', 'metadataJson.productionConstraints.panelJoinMessage', 'warning', 'production'));
}

function validateContentAndDelivery(item: Store, issues: ReadinessIssue[]) {
  if (!hasValue(item.content.shortDescription)) issues.push(issue('SHORT_DESCRIPTION_REQUIRED', 'Add a short storefront description.', 'metadataJson.content.shortDescription', 'warning', 'content'));
  if (!hasValue(item.content.longDescription)) issues.push(issue('LONG_DESCRIPTION_REQUIRED', 'Add a detailed storefront description.', 'metadataJson.content.longDescription', 'warning', 'content'));
  if (!hasValue(item.media.heroImageUrl) && !arrayValue(item.media.gallery).length) issues.push(issue('PRODUCT_IMAGE_REQUIRED', 'Add at least one product image for storefront display.', 'metadataJson.media', 'warning', 'content'));
  if (!item.deliveryServices.length) issues.push(issue('DELIVERY_SERVICES_REQUIRED', 'Configure at least one delivery/turnaround service.', 'metadataJson.delivery.services', 'error', 'delivery'));
  if (item.checkout.paymentEnabled === false) issues.push(issue('PAYMENT_DISABLED', 'Payment must be enabled before taking online orders.', 'metadataJson.checkout.paymentEnabled', 'warning', 'checkout'));
  if (!item.storefront.visible) issues.push(issue('STOREFRONT_HIDDEN', 'Product is not visible on the storefront.', 'metadataJson.storefront.visible', 'warning', 'storefront'));
}

function sectionSummary(issues: ReadinessIssue[]) {
  const sections = ['basics', 'content', 'delivery', 'options', 'rules', 'pricing', 'artwork', 'production', 'checkout', 'storefront'];
  return sections.map((section) => {
    const sectionIssues = issues.filter((entry) => entry.section === section);
    return {
      section,
      errors: sectionIssues.filter((entry) => entry.severity === 'error').length,
      warnings: sectionIssues.filter((entry) => entry.severity === 'warning').length,
      recommendations: sectionIssues.filter((entry) => entry.severity === 'recommendation').length,
      ok: !sectionIssues.some((entry) => entry.severity === 'error'),
    };
  });
}

export function checkProductReadiness(product: Store) {
  const item = normaliseProduct(product);
  const issues: ReadinessIssue[] = [];

  if (!item.name) issues.push(issue('NAME_REQUIRED', 'Product name is required.', 'name', 'error', 'basics'));
  if (!item.slug) issues.push(issue('SLUG_REQUIRED', 'Storefront slug is required.', 'slug', 'error', 'basics'));
  if (!item.categoryId) issues.push(issue('CATEGORY_REQUIRED', 'Choose a product category before publishing.', 'categoryId', 'error', 'basics'));
  if (!item.productType && !item.metadataJson.template) issues.push(issue('TEMPLATE_REQUIRED', 'Choose a product template/type.', 'metadataJson.template', 'warning', 'basics'));

  validateContentAndDelivery(item, issues);
  validateOptionGroups(item, issues);
  validateRules(item, issues);
  validatePricing(item, issues);
  validateArtworkAndProduction(item, issues);

  const errors = issues.filter((entry) => entry.severity === 'error').length;
  const warnings = issues.filter((entry) => entry.severity === 'warning').length;
  const recommendations = issues.filter((entry) => entry.severity === 'recommendation').length;
  const score = Math.max(0, Math.min(100, 100 - errors * 18 - warnings * 5 - recommendations * 2));

  return {
    product: item,
    ready: errors === 0,
    score,
    errors,
    warnings,
    recommendations,
    issues,
    sections: sectionSummary(issues),
  };
}

export async function listProductReadiness(request: Request) {
  const data = await listInternalCatalog(tenantContextFromRequest(request), PRODUCT_RESOURCE, { page: 1, limit: 300 });
  const items = ((data as any).items || []).map((product: Store) => checkProductReadiness(product));
  return {
    items,
    summary: {
      total: items.length,
      ready: items.filter((item: Store) => item.ready).length,
      blocked: items.filter((item: Store) => !item.ready).length,
      warnings: items.reduce((sum: number, item: Store) => sum + item.warnings, 0),
      averageScore: items.length ? Math.round(items.reduce((sum: number, item: Store) => sum + Number(item.score || 0), 0) / items.length) : 0,
    },
  };
}

export async function getProductReadiness(request: Request, id: string) {
  const product = await getInternalCatalogRecord(tenantContextFromRequest(request), PRODUCT_RESOURCE, id);
  return checkProductReadiness(product as Store);
}

export async function applyProductPublishPatch(request: Request, input: Store) {
  const context = tenantContextFromRequest(request);
  const id = String(input.id || '').trim();
  if (!id) throw new Error('Product id is required.');
  const existing = await getInternalCatalogRecord(context, PRODUCT_RESOURCE, id) as Store;
  const meta = metadata(existing);
  const nextMeta = {
    ...meta,
    status: input.status || meta.status || 'draft',
    vatRate: input.vatRate ?? meta.vatRate ?? 'standard',
    artworkRequired: input.artworkRequired ?? meta.artworkRequired ?? true,
    optionGroups: input.optionGroups ?? meta.optionGroups ?? meta.options ?? [],
    options: input.options ?? input.optionGroups ?? meta.options ?? meta.optionGroups ?? [],
    selectorUi: input.selectorUi ?? meta.selectorUi ?? { version: 'v366', layout: 'stepped-configurator' },
    quantities: input.quantities ?? meta.quantities ?? [100, 250, 500, 1000],
    delivery: input.delivery ?? meta.delivery ?? { services: [{ id: 'standard', label: 'Standard', workingDays: 3, enabled: true }] },
    pricing: input.pricing ?? meta.pricing ?? { source: 'fixed', mode: 'fixed' },
    printMaths: input.printMaths ?? meta.printMaths ?? {},
    finishing: input.finishing ?? meta.finishing ?? [],
    artwork: input.artwork ?? meta.artwork ?? { acceptedFiles: ['pdf'], bleedMm: 3 },
    artworkRules: input.artworkRules ?? meta.artworkRules ?? { profile: 'print-ready-pdf', bleedMm: 3, fileTypes: ['pdf'] },
    productionConstraints: input.productionConstraints ?? meta.productionConstraints ?? {},
    storefront: { ...(meta.storefront || {}), visible: input.visible ?? meta.storefront?.visible ?? true },
    checkout: { ...(meta.checkout || {}), paymentEnabled: input.paymentEnabled ?? meta.checkout?.paymentEnabled ?? true },
  };
  const updated = await writeInternalCatalogRecord(context, PRODUCT_RESOURCE, {
    id,
    name: input.name || existing.name,
    slug: input.slug || existing.slug,
    categoryId: input.categoryId ?? existing.categoryId,
    priceFromMinor: input.priceFromMinor ?? existing.priceFromMinor,
    currency: input.currency || existing.currency || 'GBP',
    isActive: input.isActive ?? existing.isActive ?? false,
    metadataJson: nextMeta,
  }, 'update');
  return checkProductReadiness(updated as Store);
}
