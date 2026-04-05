import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Uptime Report"
      subtitle="Track storefront uptime, latency, and service health over time."
      actionLabel="Create Snapshot"
      items={[
        { title: 'Storefront API', subtitle: '99.96% uptime last 30 days', meta: 'Latency stable' },
        { title: 'Proof Renderer', subtitle: '99.82% uptime last 30 days', meta: 'One degraded incident' },
        { title: 'Admin Dashboard', subtitle: '99.91% uptime last 30 days', meta: 'No active alerts' }
      ]}
    />
  );
}
