import { NextRequest, NextResponse } from 'next/server';
import { loadProductForNativePricing, formatMinorPrice } from '@/core/storefront/native-pricing.service';
import { resolveProductConfig, rowPriceMinor } from '@/core/storefront/product-config-engine';
import { calculateVatLine } from '@/core/tax/vat-rules';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function tenantScopedRequest(request: NextRequest, tenantSlug: string) { const url = new URL(request.url); url.searchParams.set('tenantId', tenantSlug); return new Request(url, { headers: request.headers }); }
function isQuoteProduct(product: Record<string, any>) {
  const mode = String(product.buyingMode || product.orderMode || product.metadataJson?.buyingMode || product.metadataJson?.orderMode || '').toLowerCase();
  const type = String(product.productType || product.type || product.metadataJson?.productType || '').toUpperCase();
  return ['quote', 'quote-only', 'request-quote', 'quote_led', 'quote-led'].includes(mode) || type === 'QUOTE_LED';
}
function imageList(product: Record<string, any>) {
  const media = product.metadataJson?.media || product.media || {};
  const direct = [product.image, product.imageUrl, product.thumbnail, product.heroImage, product.metadataJson?.image, media.heroImageUrl].filter(Boolean).map(String);
  const gallery = Array.isArray(media.gallery) ? media.gallery.map(String) : [];
  return Array.from(new Set([...direct, ...gallery].filter(Boolean)));
}
function contentFrom(product: Record<string, any>) {
  const content = product.metadataJson?.content || product.content || {};
  return {
    shortDescription: content.shortDescription || product.description || product.subtitle || '',
    longDescription: content.longDescription || product.longDescription || '',
    specifications: Array.isArray(content.specifications) ? content.specifications : [],
    designGuidelines: Array.isArray(content.designGuidelines) ? content.designGuidelines : [],
    faqs: Array.isArray(content.faqs) ? content.faqs : [],
    orderingProcess: Array.isArray(content.orderingProcess) ? content.orderingProcess : [],
    materialDetails: Array.isArray(content.materialDetails) ? content.materialDetails : [],
  };
}
function initialPrice(product: Record<string, any>, resolvedConfig: Record<string, any>) {
  const matchedRow = resolvedConfig.matchedRow as Record<string, any> | null;
  const grossMinor = Number(rowPriceMinor(matchedRow) || resolvedConfig.priceMinor || 0);
  if (!matchedRow || !grossMinor) return null;
  const quantity = Math.max(1, Math.round(Number(resolvedConfig.selectedQuantity || matchedRow.quantity || 1)));
  const taxLine = calculateVatLine({
    productId: product.id || product.slug || '',
    productSlug: product.slug || product.id || '',
    productName: product.name || product.title || product.slug || 'Storefront product',
    titleSnapshot: product.name || product.title || product.slug || 'Storefront product',
    sku: matchedRow.sku || matchedRow.oldSku || '',
    categoryName: product.categoryName || product.metadataJson?.categoryName || '',
    categorySlug: product.categorySlug || product.metadataJson?.categorySlug || '',
    totalPriceMinor: grossMinor,
    taxSettings: matchedRow.taxSettings || matchedRow.metadata?.taxSettings || product.taxSettings || product.metadataJson?.taxSettings || product.metadataJson?.pricing?.taxSettings,
    vatRate: matchedRow.vatRate ?? matchedRow.taxRate ?? product.vatRate ?? product.taxRate ?? product.metadataJson?.vatRate ?? product.metadataJson?.taxRate,
    resolverSnapshot: {
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name || product.title,
        title: product.title || product.name,
        categoryName: product.categoryName || '',
        categorySlug: product.categorySlug || '',
        taxSettings: product.taxSettings || product.metadataJson?.taxSettings,
        vatRate: product.vatRate ?? product.taxRate ?? product.metadataJson?.vatRate ?? product.metadataJson?.taxRate,
      },
      pricing: { source: 'internal-storefront-product-contract', matchedRow },
    },
  }, quantity, grossMinor);
  const currency = String(matchedRow.currency || product.currency || product.metadataJson?.pricingMatrix?.currency || 'GBP');
  return {
    currency,
    quantity,
    netMinor: taxLine.netMinor,
    vatMinor: taxLine.vatMinor,
    grossMinor: taxLine.grossMinor,
    formattedPrice: formatMinorPrice(taxLine.grossMinor, currency),
    vatRate: taxLine.vatRate,
    vatClass: taxLine.vatClass,
    vatReason: taxLine.vatReason,
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tenantSlug = slug(url.searchParams.get('tenantSlug') || url.searchParams.get('tenantId') || '');
    const productSlug = slug(url.searchParams.get('productSlug') || url.searchParams.get('productId') || url.searchParams.get('slug') || '');
    if (!tenantSlug || !productSlug) {
      return NextResponse.json({ ok: false, source: 'internal-storefront-product-contract', error: 'Missing tenantSlug/tenantId or productSlug/productId.' }, { status: 400 });
    }

    const product = await loadProductForNativePricing(tenantScopedRequest(request, tenantSlug), tenantSlug, productSlug);
    const resolvedConfig = resolveProductConfig(product, {});
    const price = initialPrice(product, resolvedConfig);

    return NextResponse.json({
      ok: true,
      source: 'internal-storefront-product-contract',
      data: {
        product: {
          id: product.id,
          slug: product.slug || productSlug,
          title: product.title || product.name || productSlug,
          name: product.name || product.title || productSlug,
          description: product.description || product.subtitle || '',
          categoryId: product.categoryId || '',
          categoryName: product.categoryName || '',
          categorySlug: product.categorySlug || product.metadataJson?.categorySlug || '',
          productType: product.productType || product.metadataJson?.productType || '',
          buyingMode: isQuoteProduct(product) ? 'quote' : 'cart',
          currency: product.currency || product.metadataJson?.pricingMatrix?.currency || 'GBP',
          images: imageList(product),
          raw: product,
        },
        content: contentFrom(product),
        configurator: {
          groups: resolvedConfig.groups,
          customerGroups: resolvedConfig.customerGroups,
          hiddenGroups: resolvedConfig.hiddenGroups,
          quantityGroup: resolvedConfig.quantityGroup,
          quantityRows: resolvedConfig.quantityRows,
          deliveryGroup: resolvedConfig.deliveryGroup,
          deliveryRows: resolvedConfig.deliveryRows,
          initialSelections: resolvedConfig.selections,
          selectedQuantity: resolvedConfig.selectedQuantity,
          selectedDelivery: resolvedConfig.selectedDelivery,
          messages: resolvedConfig.messages,
          capabilities: resolvedConfig.capabilities,
          pricingMatrixRowCount: resolvedConfig.pricingMatrixRowCount,
        },
        artwork: product.artwork || product.metadataJson?.artwork || product.metadataJson?.artworkRules || {},
        tax: {
          settings: product.taxSettings || product.metadataJson?.taxSettings || product.metadataJson?.pricing?.taxSettings || null,
          vatRate: product.vatRate ?? product.taxRate ?? product.metadataJson?.vatRate ?? product.metadataJson?.taxRate ?? null,
        },
        initialPrice: price,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: 'internal-storefront-product-contract',
      error: error instanceof Error ? error.message : 'Storefront product contract failed.',
    }, { status: 500 });
  }
}
