import { Card } from '@/components/ui/card';

export function QuickActionsPanel({ actions }: { actions: string[] }) {
  return (
    <Card>
      <p className="text-xs uppercase text-textMuted">Quick Actions</p>
      <h3 className="mb-4 text-lg font-semibold">Common Tasks</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action}
            className="rounded-xl border border-border bg-panelMuted px-4 py-3 text-left text-sm hover:bg-slate-800/80"
          >
            {action}
          </button>
        ))}
      </div>
    </Card>
  );
}
