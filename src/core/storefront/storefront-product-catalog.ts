import { listInternalCatalog } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { checkProductReadiness } from '@/core/storefront/product-publish-readiness';

const PRODUCT_RESOURCE = 'products' as const;

type Store = Record<string, any>;

function meta(product: Store) {
  return product?.metadataJson && typeof product.metadataJson === 'object' ? product.metadataJson : {};
}

function visible(product: Store) {
  const m = meta(product);
  return Boolean(product.isActive) || m.status === 'published' || m.storefront?.visible === true;
}

function toStorefrontProduct(product: Store) {
  const m = meta(product);
  const readiness = checkProductReadiness(product);
  return {
    id: product.id,
    name: product.name || product.title,
    slug: product.slug,
    description: product.description || m.description || m.content?.shortDescription || '',
    categoryId: product.categoryId || null,
    categoryName: product.categoryName || m.categoryName || null,
    priceFromMinor: Number(product.priceFromMinor || m.pricing?.priceFromMinor || m.priceFromMinor || 0),
    currency: product.currency || m.currency || 'GBP',
    vatRate: m.vatRate || 'standard',
    productType: product.productType || m.template || 'print-product',
    media: m.media || {},
    content: m.content || {},
    delivery: m.delivery || {},
    designServices: Array.isArray(m.designServices) ? m.designServices : [],
    editor: m.editor || {},
    relatedProducts: Array.isArray(m.relatedProducts) ? m.relatedProducts : [],
    options: Array.isArray(m.options) ? m.options : [],
    rules: Array.isArray(m.rules) ? m.rules : [],
    quantities: Array.isArray(m.quantities) ? m.quantities : [],
    turnaroundOptions: Array.isArray(m.turnaroundOptions) ? m.turnaroundOptions : [],
    pricing: m.pricing || { source: 'fixed' },
    artworkRequired: m.artworkRequired !== false,
    artwork: m.artwork || {},
    artworkRules: m.artworkRules || {},
    storefront: { ...(m.storefront || {}), visible: visible(product) },
    checkout: m.checkout || { paymentEnabled: true },
    metadataJson: m,
    readiness: { ready: readiness.ready, errors: readiness.errors, warnings: readiness.warnings },
  };
}

export async function listStorefrontProducts(request: Request) {
  const url = new URL(request.url);
  const all = await listInternalCatalog(tenantContextFromRequest(request), PRODUCT_RESOURCE, { page: 1, limit: 300, search: url.searchParams.get('q') || undefined });
  const categoryId = url.searchParams.get('categoryId');
  const includeDrafts = url.searchParams.get('includeDrafts') === 'true';
  const items = ((all as any).items || [])
    .map((product: Store) => ({ raw: product, view: toStorefrontProduct(product), readiness: checkProductReadiness(product) }))
    .filter((entry: Store) => includeDrafts || (visible(entry.raw) && entry.readiness.ready))
    .filter((entry: Store) => !categoryId || entry.view.categoryId === categoryId)
    .map((entry: Store) => entry.view);
  return { items, count: items.length, source: 'internal-storefront-products' };
}

export async function getStorefrontProduct(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || url.searchParams.get('id') || '';
  const list = await listStorefrontProducts(request);
  const product = list.items.find((item: Store) => item.slug === slug || item.id === slug) || null;
  return { product, found: Boolean(product), source: 'internal-storefront-products' };
}
