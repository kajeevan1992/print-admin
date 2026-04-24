async function getResource(resource: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  try {
    const res = await fetch(`${base}/api/internal/catalog/${resource}`, { cache: 'no-store' });
    return await res.json();
  } catch {
    return { ok: false, data: { items: [] } };
  }
}

export const dynamic = 'force-dynamic';

export default async function InternalCatalogStatusPage() {
  const resources = ['products', 'categories', 'collections', 'tags', 'materials', 'finishes', 'option-sets'];
  const results = await Promise.all(resources.map(async (resource) => ({ resource, payload: await getResource(resource) })));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Internal Catalog Status</h1>
        <p className="mt-2 text-sm text-slate-500">Unified-core catalog resources now load from internal routes, not legacy proxy routes.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {results.map((result) => (
          <div key={result.resource} className="rounded-3xl border p-5">
            <p className="font-semibold">{result.resource}</p>
            <p className="mt-2 text-sm text-slate-500">
              {result.payload?.ok ? 'Internal core online' : 'Internal core failed'} · {result.payload?.data?.items?.length || 0} records
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
