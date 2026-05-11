export type ProductBuilderTabKey = 'overview' | 'basics' | 'content' | 'options' | 'rules' | 'pricing' | 'print-maths' | 'artwork' | 'preview' | 'publish';

export type ProductBuilderTab = {
  key: ProductBuilderTabKey;
  label: string;
  description: string;
  sourceRoutes: string[];
  canonicalRoute: string;
  legacyRoutes: string[];
  status: 'live' | 'migrate' | 'replace' | 'future';
  owns: string[];
  dataKeys: string[];
};

function tab(
  key: ProductBuilderTabKey,
  label: string,
  canonicalRoute: string,
  legacyRoutes: string[],
  status: ProductBuilderTab['status'],
  description: string,
  owns: string[],
  dataKeys: string[]
): ProductBuilderTab {
  return { key, label, description, canonicalRoute, sourceRoutes: [canonicalRoute], legacyRoutes, status, owns, dataKeys };
}

export const PRODUCT_BUILDER_JOURNEY: ProductBuilderTab[] = [
  tab('overview', 'Overview', '/product-builder?tab=overview', [], 'live', 'Single product setup workspace with setup progress, readiness summary and migration map.', ['product setup progress', 'readiness summary', 'migration map'], ['product.id', 'product.slug', 'metadataJson.builderProgress']),
  tab('basics', 'Basics', '/product-builder?tab=basics', ['/product-builder-studio'], 'live', 'Name, slug, category, template, status, VAT, base price, visibility and checkout/payment readiness.', ['product identity', 'category', 'template', 'VAT', 'base price', 'storefront visibility', 'checkout/payment enabled'], ['name', 'slug', 'categoryId', 'productType', 'priceFromMinor', 'isActive', 'metadataJson.template', 'metadataJson.vatRate', 'metadataJson.storefront', 'metadataJson.checkout']),
  tab('content', 'Storefront Content', '/product-builder?tab=content', ['/product-storefront-content'], 'live', 'Images, descriptions, delivery messages, design services, artwork guides/templates, FAQs, specs, sustainability and related products.', ['media', 'descriptions', 'delivery services', 'design add-ons', 'artwork guides', 'product tabs', 'related products', 'material content'], ['metadataJson.media', 'metadataJson.content', 'metadataJson.delivery', 'metadataJson.designServices', 'metadataJson.artwork', 'metadataJson.editor', 'metadataJson.relatedProducts']),
  tab('options', 'Options / Selector UI', '/product-builder-options', ['/option-sets', '/config-templates', '/product-builder-studio'], 'live', 'Product option groups, selector display type, option values, recommended labels, help text, custom-size fields and frontend rendering rules.', ['option groups', 'selector component type', 'option value metadata', 'custom size inputs', 'tooltips', 'recommended messages'], ['metadataJson.options', 'metadataJson.optionGroups', 'metadataJson.selectorUi']),
  tab('rules', 'Rules', '/product-builder-rules', ['/product-rules-visual', '/product-rules-builder', '/product-rules-lab'], 'live', 'Combined rules workspace with visual IF/THEN mode, advanced logic and live test mode.', ['conditional logic', 'forced values', 'blocked combinations', 'messages', 'required fields', 'price adjustments', 'panel warnings'], ['metadataJson.rules', 'metadataJson.rulesVersion']),
  tab('pricing', 'Pricing', '/product-builder-pricing', ['/pricing-engine-lab'], 'live', 'Pricing source, matrix/cost/supplier strategy, option pricing inputs, diagnostics, VAT and final selling price checks.', ['pricing source', 'option pricing inputs', 'pricing diagnostics', 'saved scenarios', 'final price checks', 'VAT logic'], ['metadataJson.pricing', 'metadataJson.optionGroups[].values[].pricing', 'metadataJson.printMaths', 'metadataJson.finishing']),
  tab('print-maths', 'Print Maths', '/product-builder-pricing', ['/print-maths-lab'], 'live', 'Advanced estimating for sheet fit, SRA3/SRA2 logic, finishing costs, VAT, margin, booklet and roll-media maths.', ['sheet fit', 'SRA3/SRA2 logic', 'cost breakdown', 'finishing maths', 'VAT quote maths', 'margin', 'roll-media maths'], ['metadataJson.printMaths', 'metadataJson.pricing', 'metadataJson.finishing', 'metadataJson.supplierPricing']),
  tab('artwork', 'Artwork & Preflight', '/product-builder-artwork', ['/artwork-preflight-studio'], 'live', 'Artwork requirement, accepted files, bleed/page profiles, preflight blocking, machine/material/supplier constraints and override policy.', ['artwork required', 'file rules', 'bleed/trim/page checks', 'preflight profiles', 'production blocking', 'machine/material/supplier constraints'], ['metadataJson.artwork', 'metadataJson.artworkRules', 'metadataJson.productionConstraints']),
  tab('preview', 'Preview', '/product-builder?tab=preview', [], 'future', 'Customer-facing product page preview: selector UI, price calculation, delivery, artwork upload state and add-to-cart behaviour.', ['customer preview', 'selector simulation', 'cart payload preview', 'storefront content preview'], ['storefront contract', 'window.storefront.products', 'metadataJson']),
  tab('publish', 'Publish Readiness', '/product-builder?tab=publish', ['/product-builder-studio'], 'migrate', 'Final readiness checks for storefront visibility, pricing, VAT, artwork, checkout/payment, content completeness and production compatibility.', ['readiness validation', 'publish blockers', 'warnings', 'go-live checklist'], ['product-readiness API', 'metadataJson.storefront', 'metadataJson.checkout'])
];

export const PRODUCT_BUILDER_LEGACY_ROUTES = Array.from(new Set(PRODUCT_BUILDER_JOURNEY.flatMap((item) => item.legacyRoutes)));

export function getProductBuilderTab(key?: string | null) {
  return PRODUCT_BUILDER_JOURNEY.find((item) => item.key === key) || PRODUCT_BUILDER_JOURNEY[0];
}

export function getProductBuilderTabHref(key: ProductBuilderTabKey, productId?: string) {
  const item = getProductBuilderTab(key);
  const [path, rawQuery = ''] = item.canonicalRoute.split('?');
  const params = new URLSearchParams(rawQuery);
  if (path === '/product-builder' && !params.has('tab')) params.set('tab', key);
  if (productId) params.set('productId', productId);
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}`;
}

export function getProductBuilderLegacyRoutesForTab(key: ProductBuilderTabKey) {
  return getProductBuilderTab(key).legacyRoutes;
}
