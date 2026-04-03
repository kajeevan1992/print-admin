import { Card } from '@/components/ui/card';

export function DashboardKpiGrid({
  kpis
}: {
  kpis: Array<{ label: string; value: string; trend: string; helper: string }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <p className="text-xs uppercase text-textMuted">{kpi.label}</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <h3 className="text-2xl font-semibold">{kpi.value}</h3>
            <span className="rounded-full border border-border px-2 py-1 text-xs">
              {kpi.trend}
            </span>
          </div>
          <p className="mt-2 text-sm text-textMuted">{kpi.helper}</p>
        </Card>
      ))}
    </div>
  );
}
