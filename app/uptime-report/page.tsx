export const dynamic = 'force-dynamic';

import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';

const services = [
  { name: 'Storefront API', uptime: '99.96%', status: 'Operational', latency: '182ms' },
  { name: 'Proof Renderer', uptime: '99.82%', status: 'Degraded once', latency: '441ms' },
  { name: 'Admin Dashboard', uptime: '99.91%', status: 'Operational', latency: '129ms' },
  { name: 'Webhook Queue', uptime: '99.87%', status: 'Operational', latency: '215ms' }
];

export default function Page() {
  return (
    <div className="space-y-4">
      <PageHeader title="Uptime Report" subtitle="Track storefront uptime, latency, and service health over time." />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-xs text-textMuted">30 Day Uptime</p><p className="mt-2 text-2xl font-semibold">99.92%</p></Card>
        <Card><p className="text-xs text-textMuted">Incidents</p><p className="mt-2 text-2xl font-semibold">3</p></Card>
        <Card><p className="text-xs text-textMuted">Avg Latency</p><p className="mt-2 text-2xl font-semibold">242ms</p></Card>
        <Card><p className="text-xs text-textMuted">Status</p><p className="mt-2 text-2xl font-semibold">Healthy</p></Card>
      </div>
      <Card>
        <div className="space-y-3">
          {services.map((service) => <div key={service.name} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{service.name}</p><p className="text-sm text-textMuted">Latency {service.latency}</p></div><div className="text-right"><p>{service.uptime}</p><p className="text-sm text-textMuted">{service.status}</p></div></div></div>)}
        </div>
      </Card>
    </div>
  );
}
