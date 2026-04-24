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
    module: 'Artwork profiles/workflow',
    status: 'pending',
    storage: 'local/demo or partial',
    internalApi: [],
    notes: 'Needs a dedicated build after catalog libraries are stable.',
  },
  {
    module: 'Printers / machines / production planner',
    status: 'pending',
    storage: 'local/demo',
    internalApi: [],
    notes: 'Needed before pricing engine can use real production constraints.',
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
    build: 'v186',
    summary: {
      connected: modules.filter((item) => item.status.startsWith('connected')).length,
      pending: modules.filter((item) => item.status === 'pending').length,
    },
    modules,
  });
}
