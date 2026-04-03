import { Card } from '@/components/ui/card';

export function StoreOverviewCard({
  store,
  organizationName
}: {
  store: {
    name: string;
    domain: string;
    status: string;
    theme: string;
    locale: string;
    currency: string;
    plan: string;
  };
  organizationName: string;
}) {
  return (
    <Card>
      <p className="text-xs uppercase text-textMuted">Store Overview</p>
      <h3 className="mt-1 text-lg font-semibold">{store.name}</h3>
      <p className="text-sm text-textMuted">{store.domain}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-panelMuted p-3">
          <p className="text-xs text-textMuted">Organization</p>
          <p className="mt-1 text-sm font-medium">{organizationName}</p>
        </div>
        <div className="rounded-xl border border-border bg-panelMuted p-3">
          <p className="text-xs text-textMuted">Status</p>
          <p className="mt-1 text-sm font-medium">{store.status}</p>
        </div>
        <div className="rounded-xl border border-border bg-panelMuted p-3">
          <p className="text-xs text-textMuted">Theme</p>
          <p className="mt-1 text-sm font-medium">{store.theme}</p>
        </div>
        <div className="rounded-xl border border-border bg-panelMuted p-3">
          <p className="text-xs text-textMuted">Plan</p>
          <p className="mt-1 text-sm font-medium">{store.plan}</p>
        </div>
        <div className="rounded-xl border border-border bg-panelMuted p-3">
          <p className="text-xs text-textMuted">Locale</p>
          <p className="mt-1 text-sm font-medium">{store.locale}</p>
        </div>
        <div className="rounded-xl border border-border bg-panelMuted p-3">
          <p className="text-xs text-textMuted">Currency</p>
          <p className="mt-1 text-sm font-medium">{store.currency}</p>
        </div>
      </div>
    </Card>
  );
}
