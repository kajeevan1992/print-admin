import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';

export function PlanSummaryCard({
  planName,
  billingCycle,
  subscriptionStatus,
  supportTier,
  nextPaymentDate,
  storesUsed,
  storesAllowed,
  apiUsageUsed,
  apiUsageLimit
}: {
  planName: string;
  billingCycle: string;
  subscriptionStatus: string;
  supportTier: string;
  nextPaymentDate: string;
  storesUsed: number;
  storesAllowed: number;
  apiUsageUsed: number;
  apiUsageLimit: number;
}) {
  const usagePercent = Math.min(
    100,
    Math.round((apiUsageUsed / Math.max(apiUsageLimit, 1)) * 100)
  );
  const storesPercent = Math.min(
    100,
    Math.round((storesUsed / Math.max(storesAllowed, 1)) * 100)
  );

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-textMuted">Plan Info</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{planName}</h2>
          <p className="mt-1 text-sm text-textMuted">
            {billingCycle} · {subscriptionStatus} · Support: {supportTier}
          </p>
        </div>

        <Button>Manage Plan</Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-panelMuted p-4">
          <p className="text-xs uppercase text-textMuted">Next Payment</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{nextPaymentDate}</p>
        </div>

        <div className="rounded-xl border border-border bg-panelMuted p-4">
          <p className="text-xs uppercase text-textMuted">Stores Used</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {storesUsed} / {storesAllowed}
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-cyan-400"
              style={{ width: `${storesPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-panelMuted p-4">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-xs uppercase text-textMuted">API Usage</p>
          <p className="text-sm text-textMuted">
            {apiUsageUsed.toLocaleString()} / {apiUsageLimit.toLocaleString()}
          </p>
        </div>
        <div className="h-2 rounded-full bg-slate-800">
          <div
            className="h-2 rounded-full bg-violet-300"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
