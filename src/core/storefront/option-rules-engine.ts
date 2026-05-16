import { getInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { resolveProductConfig } from '@/core/storefront/product-config-engine';

const PRODUCT_RESOURCE = 'products' as const;

type Store = Record<string, any>;

function normaliseLegacyRules(product: Store) {
  const metadataJson = product?.metadataJson && typeof product.metadataJson === 'object' ? product.metadataJson : {};
  const rules = Array.isArray(metadataJson.rules) ? metadataJson.rules : [];
  return { ...product, metadataJson: { ...metadataJson, rules } };
}

function normaliseInput(input: Store) {
  const selections = input.options && typeof input.options === 'object' && !Array.isArray(input.options)
    ? input.options
    : input.selections && typeof input.selections === 'object' && !Array.isArray(input.selections)
      ? input.selections
      : {};

  return {
    selections,
    quantity: input.quantity ?? selections.quantity ?? selections.qty ?? null,
    delivery: input.delivery ?? input.turnaround ?? selections.turnaround ?? null,
  };
}

export function evaluateOptionRules(product: Store, input: Store) {
  const resolved = resolveProductConfig(normaliseLegacyRules(product), normaliseInput(input));
  return {
    ok: true,
    blocked: false,
    selections: resolved.selections,
    visibleGroups: resolved.customerGroups,
    hiddenGroups: resolved.hiddenGroups,
    quantityRows: resolved.quantityRows,
    deliveryRows: resolved.deliveryRows,
    selectedQuantity: resolved.selectedQuantity,
    selectedDelivery: resolved.selectedDelivery,
    matchedRow: resolved.matchedRow,
    priceMinor: resolved.priceMinor,
    messages: resolved.messages || [],
    appliedActions: resolved.appliedActions || [],
    ruleCount: resolved.ruleCount || 0,
    capabilities: resolved.capabilities,
    resolvedConfig: resolved,
  };
}

export async function evaluateProductRules(request: Request, input: Store) {
  const id = String(input.productId || input.id || input.slug || '').trim();
  if (!id) throw new Error('productId, id or slug is required.');
  const product = await getInternalCatalogRecord(tenantContextFromRequest(request), PRODUCT_RESOURCE, id);
  return evaluateOptionRules(product as Store, input);
}
