'use client';

type Store = {
  id: string;
  name: string;
  domain: string;
  status: string;
  plan: string;
};

export function StoreSwitcher({
  stores,
  selectedStoreId,
  onChange
}: {
  stores: Store[];
  selectedStoreId: string;
  onChange: (storeId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel px-3 py-2">
      <label className="mb-1 block text-[11px] uppercase tracking-wide text-textMuted">
        Active Store
      </label>
      <select
        value={selectedStoreId}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[240px] bg-transparent text-sm outline-none"
      >
        {stores.map((store) => (
          <option key={store.id} value={store.id} className="bg-slate-900">
            {store.name} · {store.status} · {store.plan}
          </option>
        ))}
      </select>
    </div>
  );
}
