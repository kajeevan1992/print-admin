export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const SUPPLIER_KEY = 'storefront-trade-suppliers-foundation';

function responseError(error: unknown, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error: error instanceof Error ? error.message : 'Trade supplier request failed.',
    },
    { status }
  );
}

async function readRecord(request: NextRequest, key: string) {
  try {
    return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
  } catch (error) {
    if ((error instanceof Error ? error.message : '').includes('was not found')) return null;
    throw error;
  }
}

async function saveStore(request: NextRequest, store: any) {
  return upsertInternalCatalogRecord(
    tenantContextFromRequest(request),
    CONFIG_RESOURCE,
    {
      id: SUPPLIER_KEY,
      slug: SUPPLIER_KEY,
      name: 'Trade supplier foundation',
      description: 'Supplier API credential registry, synced products/options/prices and clone/edit controls.',
      metadataJson: {
        store,
        savedAt: new Date().toISOString(),
        storageKey: SUPPLIER_KEY,
        source: 'TradeSuppliersFoundation',
      },
    } as any
  );
}

function defaults() {
  return {
    suppliers: [
      {
        id: 'supplier-tradeprint',
        name: 'Tradeprint',
        status: 'credential-required',
        authType: 'api-key-secret',
        globalMarkupPercent: 35,
        enabled: true,
      },
      {
        id: 'supplier-route1',
        name: 'Route 1 / Matrix Supplier',
        status: 'credential-required',
        authType: 'api-key-secret',
        globalMarkupPercent: 30,
        enabled: false,
      },
      {
        id: 'supplier-generic',
        name: 'Generic Trade Supplier',
        status: 'credential-required',
        authType: 'api-key-secret',
        globalMarkupPercent: 25,
        enabled: false,
      },
    ],
    products: [
      {
        id: 'supplier-product-business-cards',
        supplierId: 'supplier-tradeprint',
        name: 'Supplier Business Cards',
        cloneStatus: 'available',
        pricingSource: 'supplier_api',
        productMarkupPercent: 40,
        materials: ['350gsm silk', '450gsm silk', '400gsm uncoated', 'kraft', 'recycled', 'luxury'],
        disabledMaterials: ['kraft', 'luxury', 'recycled'],
        sides: ['single', 'double'],
        disabledSides: [],
        quantities: [100, 250, 500, 1000, 2500, 5000, 10000, 25000],
        blockedQuantities: [25000],
        images: ['supplier-image-placeholder'],
        artworkPdfs: ['supplier-artwork-guide.pdf'],
      },
      {
        id: 'supplier-product-a5-leaflets',
        supplierId: 'supplier-tradeprint',
        name: 'Supplier A5 Leaflets',
        cloneStatus: 'available',
        pricingSource: 'supplier_api',
        productMarkupPercent: 35,
        materials: ['130gsm silk', '170gsm silk', '250gsm silk'],
        disabledMaterials: [],
        sides: ['single', 'double'],
        disabledSides: [],
        quantities: [100, 250, 500, 1000, 2500, 5000, 10000],
        blockedQuantities: [],
        images: ['supplier-leaflet-placeholder'],
        artworkPdfs: ['a5-artwork-guide.pdf'],
      },
    ],
    clones: [],
    actions: [],
  };
}

function summary(store: any) {
  return {
    supplierCount: store.suppliers?.length || 0,
    enabledSupplierCount: (store.suppliers || []).filter((s: any) => s.enabled).length,
    syncedProductCount: store.products?.length || 0,
    clonedProductCount: store.clones?.length || 0,
    actionCount: store.actions?.length || 0,
  };
}

async function readStore(request: NextRequest) {
  const record = await readRecord(request, SUPPLIER_KEY);
  const store = (record as any)?.metadataJson?.store;
  if (store && typeof store === 'object') return store;

  const next = defaults();
  await saveStore(request, next);
  return next;
}

export async function GET(request: NextRequest) {
  try {
    const store = await readStore(request);

    return NextResponse.json({
      ok: true,
      source: 'internal-trade-suppliers-foundation-db',
      data: {
        ...store,
        summary: summary(store),
        capabilities: [
          'api_credentials',
          'sync_products',
          'clone_product',
          'rename_product',
          'edit_description',
          'replace_images',
          'artwork_pdf_import',
          'disable_materials',
          'disable_sides',
          'block_quantities',
          'global_markup',
          'product_markup',
        ],
      },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'sync-demo');
    const store = await readStore(request);
    const now = new Date().toISOString();

    if (action === 'clone-demo-product') {
      const product = store.products?.[0];
      if (product) {
        store.clones = [
          {
            id: `clone-${Date.now()}`,
            sourceProductId: product.id,
            supplierId: product.supplierId,
            name: 'My Business Cards',
            description:
              'Editable cloned supplier product. Materials/quantities/sides can be hidden before storefront publish.',
            pricingSource: 'supplier_api',
            productMarkupPercent: product.productMarkupPercent,
            disabledMaterials: product.disabledMaterials,
            disabledSides: product.disabledSides,
            blockedQuantities: product.blockedQuantities,
            images: product.images,
            artworkPdfs: product.artworkPdfs,
            createdAt: now,
          },
          ...(store.clones || []),
        ].slice(0, 50);
      }
    }

    if (action === 'sync-demo') {
      store.suppliers = (store.suppliers || []).map((supplier: any, index: number) =>
        index === 0 ? { ...supplier, status: 'demo-synced', lastSyncAt: now } : supplier
      );
    }

    store.actions = [
      { id: `supplier-action-${Date.now()}`, action, at: now },
      ...(store.actions || []),
    ].slice(0, 100);

    await saveStore(request, store);

    return NextResponse.json({
      ok: true,
      source: 'internal-trade-suppliers-foundation-db',
      data: { ...store, summary: summary(store) },
      item: store.actions[0],
    });
  } catch (error) {
    return responseError(error);
  }
}
