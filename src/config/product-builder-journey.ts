export type ProductBuilderTabKey =
  | 'overview'
  | 'basics'
  | 'content'
  | 'options'
  | 'rules'
  | 'pricing'
  | 'print-maths'
  | 'artwork'
  | 'preview'
  | 'publish';

export type ProductBuilderTab = {
  key: ProductBuilderTabKey;
  label: string;
  description: string;
  sourceRoutes: string[];
  status: 'live' | 'migrate' | 'replace' | 'future';
  owns: string[];
  dataKeys: string[];
};

export const PRODUCT_BUILDER_JOURNEY: ProductBuilderTab[] = [
  {
    key: 'overview',
    label: 'Overview',
    description: 'Single product setup workspace. Select a product, see setup health, and move through the full configuration journey.',
    sourceRoutes: ['/product-builder'],
    status: 'live',
    owns: ['product setup progress', 'readiness summary', 'migration map'],
    dataKeys: ['product.id', 'product.slug', 'metadataJson.builderProgress']
  },
  {
    key: 'basics',
    label: 'Basics',
    description: 'Name, slug, category, template, status, VAT, base price, visibility and checkout/payment readiness.',
    sourceRoutes: ['/product-builder-studio'],
    status: 'migrate',
    owns: ['product identity', 'category', 'template', 'VAT', 'base price', 'storefront visibility', 'checkout/payment enabled'],
    dataKeys: ['name', 'slug', 'categoryId', 'productType', 'priceFromMinor', 'isActive', 'metadataJson.template', 'metadataJson.vatRate', 'metadataJson.storefront', 'metadataJson.checkout']
  },
  {
    key: 'content',
    label: 'Storefront Content',
    description: 'Images, descriptions, delivery messages, design services, artwork guides/templates, FAQs, specs, sustainability and related products.',
    sourceRoutes: ['/product-storefront-content'],
    status: 'migrate',
    owns: ['media', 'descriptions', 'delivery services', 'design add-ons', 'artwork guides', 'product tabs', 'related products', 'material content'],
    dataKeys: ['metadataJson.media', 'metadataJson.content', 'metadataJson.delivery', 'metadataJson.designServices', 'metadataJson.artwork', 'metadataJson.editor', 'metadataJson.relatedProducts']
  },
  {
    key: 'options',
    label: 'Options / Selector UI',
    description: 'Product option groups, selector display type, option values, recommended labels, help text, custom-size fields and frontend rendering rules.',
    sourceRoutes: ['/option-sets', '/config-templates', '/product-builder-studio'],
    status: 'future',
    owns: ['option groups', 'selector component type', 'option value metadata', 'custom size inputs', 'tooltips', 'recommended messages'],
    dataKeys: ['metadataJson.options', 'metadataJson.optionGroups', 'metadataJson.selectorUi']
  },
  {
    key: 'rules',
    label: 'Rules',
    description: 'One combined rules workspace with visual IF/THEN mode, advanced JSON mode and live test mode.',
    sourceRoutes: ['/product-rules-visual', '/product-rules-builder', '/product-rules-lab'],
    status: 'migrate',
    owns: ['conditional logic', 'forced values', 'blocked combinations', 'messages', 'required fields', 'price adjustments', 'panel warnings'],
    dataKeys: ['metadataJson.rules', 'metadataJson.rulesVersion']
  },
  {
    key: 'pricing',
    label: 'Pricing',
    description: 'Pricing source, matrix/cost/supplier strategy, option pricing inputs, diagnostics, saved scenarios and final selling price checks.',
    sourceRoutes: ['/pricing-engine-lab'],
    status: 'migrate',
    owns: ['pricing source', 'option pricing inputs', 'pricing diagnostics', 'saved pricing scenarios', 'final price checks'],
    dataKeys: ['metadataJson.pricing', 'metadataJson.optionGroups[].values[].pricing', 'pricing diagnostics API']
  },
  {
    key: 'print-maths',
    label: 'Print Maths',
    description: 'Advanced print estimating for sheet fit, SRA3/SRA2 logic, finishing costs, VAT, margin, quote snapshots and draft-order payloads.',
    sourceRoutes: ['/print-maths-lab'],
    status: 'migrate',
    owns: ['sheet fit', 'cost breakdown', 'finishing maths', 'VAT quote maths', 'margin', 'quote snapshots', 'draft order payloads'],
    dataKeys: ['print maths API', 'quote snapshots config', 'draft orders']
  },
  {
    key: 'artwork',
    label: 'Artwork & Preflight',
    description: 'Artwork requirement, accepted files, bleed/trim/page-count profiles, customer guides/templates, preflight blocking and authorised overrides.',
    sourceRoutes: ['/artwork-preflight-studio'],
    status: 'migrate',
    owns: ['artwork required', 'file rules', 'bleed/trim/page checks', 'preflight profiles', 'production blocking', 'override policy'],
    dataKeys: ['metadataJson.artwork', 'metadataJson.artworkRules', 'artwork profiles API']
  },
  {
    key: 'preview',
    label: 'Preview',
    description: 'Customer-facing product page preview: selector UI, price calculation, delivery, artwork upload state and add-to-cart behaviour.',
    sourceRoutes: ['/product-builder'],
    status: 'future',
    owns: ['customer preview', 'selector simulation', 'cart payload preview', 'storefront content preview'],
    dataKeys: ['storefront contract', 'window.storefront.products', 'metadataJson']
  },
  {
    key: 'publish',
    label: 'Publish Readiness',
    description: 'Final readiness checks for storefront visibility, pricing, VAT, artwork, checkout/payment, content completeness and production compatibility.',
    sourceRoutes: ['/product-builder-studio', '/api/internal/catalog/product-readiness'],
    status: 'migrate',
    owns: ['readiness validation', 'publish blockers', 'warnings', 'go-live checklist'],
    dataKeys: ['product-readiness API', 'metadataJson.storefront', 'metadataJson.checkout']
  }
];

export const PRODUCT_BUILDER_LEGACY_ROUTES = Array.from(
  new Set(PRODUCT_BUILDER_JOURNEY.flatMap((tab) => tab.sourceRoutes).filter((route) => route !== '/product-builder'))
);

export function getProductBuilderTab(key?: string | null) {
  return PRODUCT_BUILDER_JOURNEY.find((tab) => tab.key === key) || PRODUCT_BUILDER_JOURNEY[0];
}

export function getProductBuilderTabHref(key: ProductBuilderTabKey, productId?: string) {
  const params = new URLSearchParams({ tab: key });
  if (productId) params.set('productId', productId);
  return `/product-builder?${params.toString()}`;
}
