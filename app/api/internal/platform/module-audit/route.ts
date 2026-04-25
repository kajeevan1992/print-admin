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
    module: 'Owner platform record modules',
    status: 'connected-v197',
    storage: 'tenant-db/CoreCatalogRecord admin-config metadata',
    internalApi: ['/api/internal/config/:key/items'],
    notes: 'Remaining Owner/Super Admin record modules now use the internal config item API with browser storage as fallback only. Includes backups, billing/account plans, incidents, runbooks, renewals, success plans, QBRs, audit log, onboarding, compliance, notifications, usage limits, and related owner workspaces.',
  },

  {
    module: 'Content CMS and HTML snippets',
    status: 'connected-v198',
    storage: 'tenant-db/CoreCatalogRecord admin-config metadata',
    internalApi: ['/api/internal/config/content-records/items', '/api/internal/config/content-html-snippets/items'],
    notes: 'Blog, page, category CMS, extended content, and HTML snippets now load/save/delete through the internal config item API with visible DB/local/error status.',
  },

  {
    module: 'Platform activity log',
    status: 'connected-v202',
    storage: 'tenant-db/CoreCatalogRecord admin-config metadata',
    internalApi: ['/api/internal/config/platform-activity-log/items'],
    notes: 'Activity Log now attempts to load activity records from the internal config item API and falls back to bundled seed records if the database has no rows yet.',
  },
  {
    module: 'Uptime report',
    status: 'connected-v202',
    storage: 'tenant-db/CoreCatalogRecord admin-config metadata',
    internalApi: ['/api/internal/config/platform-uptime-services/items'],
    notes: 'Uptime Report is now an editable LocalRecordsPage workspace with create/edit/delete syncing through the internal DB/API configuration store.',
  },

  {
    module: 'Productivity workspaces',
    status: 'connected-v203',
    storage: 'tenant-db/CoreCatalogRecord admin-config metadata',
    internalApi: [
      '/api/internal/config/productivity-notifications/items',
      '/api/internal/config/productivity-saved-views/items',
      '/api/internal/config/productivity-command-center/items'
    ],
    notes: 'Notifications, Saved Views, and Command Center now use stable internal DB/API config item keys with browser storage as fallback only.',
  },


  {
    module: 'System health and diagnostics',
    status: 'connected-v204',
    storage: 'runtime/env/internal-api',
    internalApi: ['/api/internal/platform/system-health'],
    notes: 'Central diagnostics endpoint reports runtime, database environment, and internal API health without touching pricing, orders, or storefront logic.',
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
    build: 'v204',
    summary: {
      connected: modules.filter((item) => item.status.startsWith('connected')).length,
      pending: modules.filter((item) => item.status === 'pending').length,
    },
    modules,
  });
}
