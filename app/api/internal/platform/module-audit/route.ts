import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const modules = [
  {
    module: 'Products',
    status: 'connected',
    storage: 'tenant-db',
    internalApi: ['/api/internal/catalog/products', '/api/internal/catalog/products/:id'],
    notes: 'CRUD working and product option/template metadata saved.',
  },
  {
    module: 'Categories',
    status: 'connected',
    storage: 'tenant-db',
    internalApi: ['/api/internal/catalog/categories', '/api/internal/catalog/categories/:id'],
    notes: 'CRUD working and product dropdown reads database categories.',
  },
  {
    module: 'Materials Library',
    status: 'connected-v186',
    storage: 'tenant-db/CoreCatalogRecord',
    internalApi: ['/api/internal/catalog/materials'],
    notes: 'Create/edit/delete now syncs from admin page to internal API.',
  },
  {
    module: 'Finish Library',
    status: 'connected-v186',
    storage: 'tenant-db/CoreCatalogRecord',
    internalApi: ['/api/internal/catalog/finishes'],
    notes: 'Create/edit/delete now syncs from admin page to internal API.',
  },
  {
    module: 'Option Sets',
    status: 'connected-v186',
    storage: 'tenant-db/CoreCatalogRecord',
    internalApi: ['/api/internal/catalog/option-sets'],
    notes: 'Create/edit/delete now syncs from admin page to internal API.',
  },
  {
    module: 'Collections',
    status: 'connected-v187',
    storage: 'tenant-db/CoreCatalogRecord metadata',
    internalApi: ['/api/internal/catalog/collections'],
    notes: 'Create/edit/delete now syncs collections with selected product/category ids.',
  },
  {
    module: 'Tags',
    status: 'connected-v187',
    storage: 'tenant-db/CoreCatalogRecord metadata',
    internalApi: ['/api/internal/catalog/tags'],
    notes: 'Create/edit/delete plus published/sidebar toggles now sync to internal API.',
  },
  {
    module: 'Artwork profiles/workflow',
    status: 'connected-v190',
    storage: 'tenant-db/CoreCatalogRecord metadata',
    internalApi: ['/api/internal/catalog/artwork-profiles'],
    notes: 'Artwork Preflight Studio profiles now sync to internal API. Full artwork upload/preflight workflow remains pending.',
  },
  {
    module: 'Printer Management',
    status: 'connected-v188',
    storage: 'tenant-db/CoreCatalogRecord metadata',
    internalApi: ['/api/internal/catalog/printer-profiles'],
    notes: 'Printer fleet create/edit/delete/status/risk now syncs through internal API. Production planner remains pending.',
  },
  {
    module: 'Shipping Methods',
    status: 'connected-v188',
    storage: 'tenant-db/CoreCatalogRecord metadata',
    internalApi: ['/api/internal/catalog/shipping-methods'],
    notes: 'Shipping methods create/edit/delete/pause/activate now sync through internal API.',
  },
  {
    module: 'Production routing rules',
    status: 'connected-v190',
    storage: 'tenant-db/CoreCatalogRecord metadata',
    internalApi: ["/api/internal/catalog/production-routing-rules", "admin-config"],
    notes: `Production Routing Lab
- Generic admin configuration workspaces rules now sync to internal API. Full planner board remains pending.`,
  },
  {
    module: 'Owner API Keys',
    status: 'connected-v194',
    storage: 'tenant-db/CoreCatalogRecord admin-config metadata',
    internalApi: ['/api/internal/config/owner-api-keys', '/api/internal/config/owner-api-keys/items'],
    notes: 'Existing Owner API Keys UI now lists, saves, deletes, and resets through the internal config API with browser fallback only on API failure.',
  },
  {
    module: 'Owner Feature Flags',
    status: 'connected-v194',
    storage: 'tenant-db/CoreCatalogRecord admin-config metadata',
    internalApi: ['/api/internal/config/owner-feature-flags', '/api/internal/config/owner-feature-flags/items'],
    notes: 'Existing Owner Feature Flags UI now persists rollout controls through the internal config API with browser fallback only on API failure.',
  },
  {
    module: 'Orders',
    status: 'pending',
    storage: 'mixed/demo',
    internalApi: [],
    notes: 'Do not expand until product configuration and pricing foundations are stable.',
  },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-platform',
    build: 'v194',
    summary: {
      connected: modules.filter((item) => item.status.startsWith('connected')).length,
      pending: modules.filter((item) => item.status === 'pending').length,
    },
    modules,
  });
}
