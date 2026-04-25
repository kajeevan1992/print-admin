export const dynamic = 'force-dynamic';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="platform-uptime-services"
      title="Uptime Report"
      subtitle="Track storefront uptime, latency, service health, and incident notes through the internal DB/API configuration store."
      createLabel="Add Service"
      initialItems={[
        { id: 'uptime-1', title: 'Storefront API', subtitle: '99.96% uptime', meta: 'Operational • 182ms', service: 'Storefront API', status: 'Operational', uptime: '99.96%', latency: '182ms', owner: 'Platform Ops', notes: 'Primary storefront API health check.' },
        { id: 'uptime-2', title: 'Proof Renderer', subtitle: '99.82% uptime', meta: 'Degraded once • 441ms', service: 'Proof Renderer', status: 'Degraded once', uptime: '99.82%', latency: '441ms', owner: 'Artwork Ops', notes: 'Proof rendering and preview generation service.' },
        { id: 'uptime-3', title: 'Admin Dashboard', subtitle: '99.91% uptime', meta: 'Operational • 129ms', service: 'Admin Dashboard', status: 'Operational', uptime: '99.91%', latency: '129ms', owner: 'SaaS Ops', notes: 'Internal admin interface availability.' },
        { id: 'uptime-4', title: 'Webhook Queue', subtitle: '99.87% uptime', meta: 'Operational • 215ms', service: 'Webhook Queue', status: 'Operational', uptime: '99.87%', latency: '215ms', owner: 'Integrations', notes: 'Webhook processing and retry queue.' }
      ]}
      fields={[
        { key: 'service', label: 'Service' },
        { key: 'status', label: 'Status', options: ['Operational', 'Degraded', 'Degraded once', 'Incident', 'Maintenance'] },
        { key: 'uptime', label: 'Uptime' },
        { key: 'latency', label: 'Latency' },
        { key: 'owner', label: 'Owner' },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Incident notes, maintenance windows, external status page links.' }
      ]}
      subtitleFields={['uptime', 'status']}
      cardMetaFields={['owner', 'latency']}
      searchKeys={['title', 'service', 'status', 'uptime', 'latency', 'owner', 'notes']}
      primaryFilterKey="status"
    />
  );
}
