import { listInternalCatalog } from '@/core/catalog/internal-catalog.service';
import type { CatalogResource } from '@/core/catalog/catalog-store';

export const dynamic = 'force-dynamic';

const resources: CatalogResource[] = [
  'products',
  'categories',
  'collections',
  'tags',
  'materials',
  'finishes',
  'option-sets',
];

export default async function InternalCatalogStatusPage() {
  const results = await Promise.all(
    resources.map(async (resource) => {
      try {
        const data = await listInternalCatalog({ tenantId: 'platform-demo' }, resource, {
          page: 1,
          limit: 50,
        });
        return {
          resource,
          ok: true,
          count: data.items.length,
        };
      } catch {
        return {
          resource,
          ok: false,
          count: 0,
        };
      }
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Internal Catalog Status</h1>
        <p className="mt-2 text-sm text-slate-500">
          Unified-core catalog resources now load from internal services, not legacy proxy routes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {results.map((result) => (
          <div key={result.resource} className="rounded-3xl border p-5">
            <p className="font-semibold">{result.resource}</p>
            <p className="mt-2 text-sm text-slate-500">
              {result.ok ? 'Internal core online' : 'Internal core failed'} · {result.count} records
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
