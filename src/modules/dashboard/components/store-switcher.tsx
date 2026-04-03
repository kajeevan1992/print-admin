'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type StoreItem = {
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
  stores: StoreItem[];
  selectedStoreId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const active = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? stores[0],
    [stores, selectedStoreId]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-w-[280px] items-center justify-between rounded-xl border border-border bg-panel px-4 py-3 text-left"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-textMuted">
            Active Store
          </p>
          <p className="mt-1 text-sm font-medium text-text">
            {active?.name} · {active?.status} · {active?.plan}
          </p>
        </div>
        <ChevronDown size={16} className="text-textMuted" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] overflow-hidden rounded-xl border border-border bg-panel shadow-2xl">
          {stores.map((store) => {
            const selected = store.id === selectedStoreId;

            return (
              <button
                key={store.id}
                type="button"
                onClick={() => {
                  onChange(store.id);
                  setOpen(false);
                }}
                className={`w-full border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-panelMuted ${
                  selected ? 'bg-panelMuted' : ''
                }`}
              >
                <p className="text-sm font-medium text-text">{store.name}</p>
                <p className="mt-1 text-xs text-textMuted">
                  {store.domain} · {store.plan}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
