export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const STORE_KEY = 'trade-supplier-import-v282';

function errorResponse(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Trade supplier import request failed.' }, { status });
}

async function readRecord(request: NextRequest) {
  try {
    return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, STORE_KEY);
  } catch (error) {
    if ((error instanceof Error ? error.message : '').includes('was not found')) return null;
    throw error;
  }
}

async function saveStore(request: NextRequest, store: any) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: STORE_KEY,
    slug: STORE_KEY,
    name: 'Trade supplier import workspace',
    description: 'Supplier API connection, product sync, product clone, option blocking and markup controls.',
    metadataJson: {
      store,
      savedAt: new Date().toISOString(),
      storageKey: STORE_KEY,
      source: 'TradeSupplierImportV282',
    },
  } as any);
}

function demoProducts(supplierId = 'supplier-tradeprint') {
  return [
    {
      id: 'tp-business-cards-450-silk',
      supplierId,
      supplierSku: 'TP-BC-450-SILK',
      name: 'Business Cards',
      storefrontName: 'Premium Business Cards',
      description: 'Supplier-synced business card product with editable storefront copy and option blocking.',
      artworkPdfs: ['business-card-artwork-guide.pdf', 'foil-layer-guide.pdf'],
      images: ['business-card-front.jpg', 'business-card-stack.jpg'],
      vatClass: 'standard',
      pricingSource: 'supplier_api',
      supplierNetFromMinor: 1200,
      currency: 'GBP',
      globalMarkupPercent: 35,
      productMarkupPercent: 45,
      materials: [
        { key: '350gsm_silk', label: '350gsm Silk', supplierKey: '350gsm silk', enabled: true },
        { key: '450gsm_silk', label: '450gsm Silk', supplierKey: '450gsm silk', enabled: true },
        { key: '400gsm_uncoated', label: '400gsm Uncoated', supplierKey: '400gsm uncoated', enabled: true },
        { key: 'kraft_350gsm', label: 'Kraft 350gsm', supplierKey: 'kraft', enabled: false },
        { key: 'recycled_350gsm', label: 'Recycled 350gsm', supplierKey: 'recycled', enabled: false },
      ],
      sides: [
        { key: 'single_sided', label: 'Single sided', enabled: true },
        { key: 'double_sided', label: 'Double sided', enabled: true },
      ],
      quantities: [100, 250, 500, 1000, 2500, 5000, 10000, 25000].map((qty) => ({ qty, enabled: qty !== 25000 })),
      turnaroundPrices: [
        { key: 'standard', label: 'Standard', supplierNetMinor: 1200 },
        { key: 'express', label: 'Express', supplierNetMinor: 1800 },
        { key: 'rush', label: 'Priority rush', supplierNetMinor: 2600 },
      ],
      syncStatus: 'synced',
    },
    {
      id: 'tp-a5-leaflets',
      supplierId,
      supplierSku: 'TP-A5-LEAFLET',
      name: 'A5 Leaflets',
      storefrontName: 'A5 Leaflets',
      description: 'Zero-rated supplier leaflet product with supplier material/quantity pricing.',
      artworkPdfs: ['a5-leaflet-artwork-guide.pdf'],
      images: ['a5-leaflet.jpg'],
      vatClass: 'zero',
      pricingSource: 'supplier_api',
      supplierNetFromMinor: 2200,
      currency: 'GBP',
      globalMarkupPercent: 35,
      productMarkupPercent: 35,
      materials: [
        { key: '130gsm_silk', label: '130gsm Silk', supplierKey: '130gsm silk', enabled: true },
        { key: '170gsm_silk', label: '170gsm Silk', supplierKey: '170gsm silk', enabled: true },
        { key: '250gsm_silk', label: '250gsm Silk', supplierKey: '250gsm silk', enabled: true },
      ],
      sides: [
        { key: 'single_sided', label: 'Single sided', enabled: true },
        { key: 'double_sided', label: 'Double sided', enabled: true },
      ],
      quantities: [100, 250, 500, 1000, 2500, 5000, 10000].map((qty) => ({ qty, enabled: true })),
      turnaroundPrices: [
        { key: 'standard', label: 'Standard', supplierNetMinor: 2200 },
        { key: 'express', label: 'Express', supplierNetMinor: 3100 },
        { key: 'rush', label: 'Priority rush', supplierNetMinor: 4300 },
      ],
      syncStatus: 'synced',
    },
  ];
}

function defaults() {
  return {
    suppliers: [
      { id: 'supplier-tradeprint', name: 'Tradeprint', status: 'not_connected', authType: 'api_key_secret', enabled: true, globalMarkupPercent: 35, credentialsMasked: false, lastSyncAt: null },
      { id: 'supplier-route1', name: 'Route 1 / Excel Matrix', status: 'not_connected', authType: 'api_key_secret', enabled: false, globalMarkupPercent: 30, credentialsMasked: false, lastSyncAt: null },
      { id: 'supplier-generic', name: 'Generic API Supplier', status: 'not_connected', authType: 'api_key_secret', enabled: false, globalMarkupPercent: 25, credentialsMasked: false, lastSyncAt: null },
    ],
    syncedProducts: [],
    clonedProducts: [],
    actions: [],
  };
}

function summary(store: any) {
  const syncedProducts = Array.isArray(store.syncedProducts) ? store.syncedProducts : [];
  const clonedProducts = Array.isArray(store.clonedProducts) ? store.clonedProducts : [];
  return {
    supplierCount: (store.suppliers || []).length,
    connectedSuppliers: (store.suppliers || []).filter((s: any) => ['connected', 'synced'].includes(String(s.status))).length,
    syncedProductCount: syncedProducts.length,
    clonedProductCount: clonedProducts.length,
    disabledMaterialCount: syncedProducts.reduce((sum: number, p: any) => sum + (p.materials || []).filter((m: any) => !m.enabled).length, 0),
    blockedQuantityCount: syncedProducts.reduce((sum: number, p: any) => sum + (p.quantities || []).filter((q: any) => !q.enabled).length, 0),
    supplierPricingProducts: syncedProducts.filter((p: any) => p.pricingSource === 'supplier_api').length,
  };
}

async function readStore(request: NextRequest) {
  const record = await readRecord(request);
  const store = (record as any)?.metadataJson?.store;
  if (store && typeof store === 'object') return store;
  const seeded = defaults();
  await saveStore(request, seeded);
  return seeded;
}

function upsertAction(store: any, action: string, meta: any = {}) {
  store.actions = [{ id: `supplier-action-${Date.now()}`, action, at: new Date().toISOString(), ...meta }, ...(store.actions || [])].slice(0, 100);
}

export async function GET(request: NextRequest) {
  try {
    const store = await readStore(request);
    return NextResponse.json({
      ok: true,
      source: 'internal-trade-supplier-import-db',
      data: {
        ...store,
        summary: summary(store),
        capabilities: [
          'connect_supplier_credentials',
          'sync_supplier_products_options_materials_prices',
          'clone_supplier_product_to_storefront',
          'rename_product_and_materials',
          'edit_description_images_artwork_pdfs',
          'disable_materials_sides_quantities',
          'global_markup',
          'product_markup_override',
          'supplier_api_pricing_source',
        ],
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'sync-products');
    const supplierId = String(body.supplierId || 'supplier-tradeprint');
    const productId = String(body.productId || '');
    const store = await readStore(request);
    const now = new Date().toISOString();

    if (action === 'save-credentials') {
      store.suppliers = (store.suppliers || []).map((supplier: any) => supplier.id === supplierId ? {
        ...supplier,
        status: 'connected',
        credentialsMasked: true,
        apiKeyLast4: String(body.apiKey || 'demo_key').slice(-4),
        lastConnectedAt: now,
      } : supplier);
      upsertAction(store, action, { supplierId });
    }

    if (action === 'sync-products') {
      const products = demoProducts(supplierId);
      const existingOtherSupplier = (store.syncedProducts || []).filter((product: any) => product.supplierId !== supplierId);
      store.syncedProducts = [...products, ...existingOtherSupplier];
      store.suppliers = (store.suppliers || []).map((supplier: any) => supplier.id === supplierId ? { ...supplier, status: 'synced', lastSyncAt: now, credentialsMasked: true } : supplier);
      upsertAction(store, action, { supplierId, productCount: products.length });
    }

    if (action === 'toggle-material' || action === 'toggle-side' || action === 'toggle-quantity') {
      store.syncedProducts = (store.syncedProducts || []).map((product: any) => {
        if (product.id !== productId) return product;
        if (action === 'toggle-material') return { ...product, materials: (product.materials || []).map((m: any) => m.key === body.key ? { ...m, enabled: !m.enabled } : m) };
        if (action === 'toggle-side') return { ...product, sides: (product.sides || []).map((s: any) => s.key === body.key ? { ...s, enabled: !s.enabled } : s) };
        return { ...product, quantities: (product.quantities || []).map((q: any) => Number(q.qty) === Number(body.qty) ? { ...q, enabled: !q.enabled } : q) };
      });
      upsertAction(store, action, { productId, key: body.key, qty: body.qty });
    }

    if (action === 'apply-global-markup') {
      const markup = Number(body.globalMarkupPercent ?? 35);
      store.suppliers = (store.suppliers || []).map((supplier: any) => supplier.id === supplierId ? { ...supplier, globalMarkupPercent: markup } : supplier);
      store.syncedProducts = (store.syncedProducts || []).map((product: any) => product.supplierId === supplierId ? { ...product, globalMarkupPercent: markup } : product);
      upsertAction(store, action, { supplierId, globalMarkupPercent: markup });
    }

    if (action === 'set-product-markup') {
      const markup = Number(body.productMarkupPercent ?? 40);
      store.syncedProducts = (store.syncedProducts || []).map((product: any) => product.id === productId ? { ...product, productMarkupPercent: markup } : product);
      upsertAction(store, action, { productId, productMarkupPercent: markup });
    }

    if (action === 'clone-product') {
      const product = (store.syncedProducts || []).find((p: any) => p.id === productId) || (store.syncedProducts || [])[0];
      if (!product) return NextResponse.json({ ok: false, error: 'Sync supplier products before cloning.' }, { status: 400 });
      const enabledMaterials = (product.materials || []).filter((m: any) => m.enabled);
      const enabledSides = (product.sides || []).filter((s: any) => s.enabled);
      const enabledQuantities = (product.quantities || []).filter((q: any) => q.enabled);
      const clone = {
        id: `clone-${Date.now()}`,
        sourceProductId: product.id,
        supplierId: product.supplierId,
        name: body.name || product.storefrontName || product.name,
        description: body.description || product.description,
        pricingSource: 'supplier_api',
        vatClass: product.vatClass,
        productMarkupPercent: product.productMarkupPercent,
        materialKeys: enabledMaterials.map((m: any) => m.key),
        sideKeys: enabledSides.map((s: any) => s.key),
        quantities: enabledQuantities.map((q: any) => q.qty),
        images: product.images || [],
        artworkPdfs: product.artworkPdfs || [],
        status: 'draft_cloned_supplier_product',
        createdAt: now,
      };
      store.clonedProducts = [clone, ...(store.clonedProducts || [])].slice(0, 50);
      upsertAction(store, action, { productId: product.id, cloneId: clone.id });
    }

    await saveStore(request, store);
    return NextResponse.json({ ok: true, source: 'internal-trade-supplier-import-db', data: { ...store, summary: summary(store) }, item: store.actions?.[0] });
  } catch (error) {
    return errorResponse(error);
  }
}
