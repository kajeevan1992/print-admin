import { Bell, Search } from 'lucide-react';

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 mb-6 flex items-center justify-between rounded-xl border border-border bg-panel p-3">
      <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-border bg-panelMuted px-3 py-2">
        <Search size={14} className="text-textMuted" />
        <input placeholder="Search products, orders, users..." className="w-full bg-transparent text-sm outline-none" />
      </div>
      <div className="ml-4 flex items-center gap-3">
        <button className="rounded-lg border border-border p-2"><Bell size={16} /></button>
        <div className="rounded-lg border border-border px-3 py-2 text-sm">Alex Rivera · Admin</div>
      </div>
    </header>
  );
}
