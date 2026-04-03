import { Card } from '@/components/ui/card';

type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  change: string;
  hint: string;
};

export function DashboardKpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.id} className="p-4 transition hover:border-slate-600">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-textMuted">{kpi.label}</p>
              <h3 className="mt-3 text-4xl font-semibold tracking-tight">
                {kpi.value}
              </h3>
              <p className="mt-2 text-sm text-textMuted">{kpi.hint}</p>
            </div>

            <div className="rounded-full border border-border px-3 py-2 text-sm text-text">
              {kpi.change}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
