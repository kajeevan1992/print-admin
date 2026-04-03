import { Card } from '@/components/ui/card';

export function PlanSummaryCard({
  planName,
  billingCycle,
  nextPaymentDate,
  subscriptionStatus,
  storesUsed,
  storesAllowed,
  apiQuotaUsed,
  apiQuotaLimit,
  supportTier
}: {
  planName: string;
  billingCycle: string;
  nextPaymentDate: string;
  subscriptionStatus: string;
  storesUsed: number;
  storesAllowed: number;
  apiQuotaUsed: number;
  apiQuotaLimit: number;
  supportTier: string;
}) {
  const storePercent = Math.min(100, Math.round((storesUsed / storesAllowed) * 100));
  const apiPercent = Math.min(100, Math.round((apiQuotaUsed / apiQuotaLimit) * 100));

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-textMuted">Plan Info</p>
          <h3 className="text-lg font-semibold">{planName}</h3>
          <p className="text-sm text-textMuted">
            {billingCycle} · {subscriptionStatus} · Support: {supportTier}
          </p>
        </div>
        <button className="rounded-lg border border-border px-3 py-2 text-sm">
          Manage Plan
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-panelMuted p-3">
          <p className="text-xs uppercase text-textMuted">Next Payment</p>
          <p className="mt-1 text-base font-semibold">{nextPaymentDate}</p>
        </div>

        <div className="rounded-xl border border-border bg-panelMuted p-3">
          <p className="text-xs uppercase text-textMuted">Stores Used</p>
          <p className="mt-1 text-base font-semibold">
            {storesUsed} / {storesAllowed}
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${storePercent}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-panelMuted p-3 md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase text-textMuted">API Usage</p>
            <p className="text-xs text-textMuted">
              {apiQuotaUsed.toLocaleString()} / {apiQuotaLimit.toLocaleString()}
            </p>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-indigo-400" style={{ width: `${apiPercent}%` }} />
          </div>
        </div>
      </div>
    </Card>
  );
}
