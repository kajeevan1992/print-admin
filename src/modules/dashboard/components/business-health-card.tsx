import { Card } from '@/components/ui/card';

const statusStyles: Record<string, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  error: 'bg-red-500/15 text-red-300 border-red-500/30'
};

export function BusinessHealthCard({
  items
}: {
  items: Array<{ label: string; status: string }>;
}) {
  return (
    <Card>
      <p className="text-xs uppercase text-textMuted">Business Health</p>
      <h3 className="mb-4 text-lg font-semibold">System Status</h3>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-border bg-panelMuted p-3"
          >
            <span className="text-sm">{item.label}</span>
            <span
              className={`rounded-full border px-2 py-1 text-xs ${statusStyles[item.status] ?? 'border-border text-textMuted'}`}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
