'use client';

import { useState } from 'react';

export function StoreSwitcher({
  stores,
  selectedStoreId,
  onChange
}: {
  stores: any[];
  selectedStoreId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const active = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-xl border border-border bg-panel px-4 py-2 text-sm"
      >
        <div className="text-left">
          <p className="text-[10px] uppercase text-textMuted">Active Store</p>
          <p className="font-medium">
            {active?.name} · {active?.status} · {active?.plan}
          </p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[300px] rounded-xl border border-border bg-panel shadow-xl z-50">
          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => {
                onChange(store.id);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-left hover:bg-slate-800 ${
                store.id === selectedStoreId ? 'bg-slate-800' : ''
              }`}
            >
              <p className="font-medium">{store.name}</p>
              <p className="text-xs text-textMuted">
                {store.domain} · {store.plan}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
