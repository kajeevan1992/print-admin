import { Card } from '@/components/ui/card';

const alertStyles: Record<string, string> = {
  high: 'border-red-500/40 bg-red-500/10',
  medium: 'border-amber-500/40 bg-amber-500/10',
  low: 'border-cyan-500/40 bg-cyan-500/10'
};

export function AlertsPanel({
  alerts
}: {
  alerts: Array<{ id: string; severity: string; title: string; message: string }>;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-textMuted">Alerts</p>
          <h3 className="text-lg font-semibold">Action Center</h3>
        </div>
        <button className="rounded-lg border border-border px-3 py-2 text-sm">
          View All
        </button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-xl border p-3 ${alertStyles[alert.severity] ?? 'border-border bg-panelMuted'}`}
          >
            <p className="font-medium">{alert.title}</p>
            <p className="mt-1 text-sm text-textMuted">{alert.message}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
