import { Card } from '@/components/ui/card';
import type { KPI } from '@/modules/dashboard/types';

export function KpiGrid({ kpis }: { kpis: KPI[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <p className="text-sm text-textMuted">{kpi.label}</p>
          <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
          <p className="mt-1 text-xs text-accentAlt">{kpi.trend}</p>
        </Card>
      ))}
    </div>
  );
}
