import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Order Status"
      subtitle="Customize status pipeline labels used by order management and production."
      actionLabel="Add Status"
      items={[
        { title: 'Awaiting Artwork', subtitle: 'Pre-production checkpoint', meta: 'Customer action required' },
        { title: 'In Production', subtitle: 'Active print job', meta: 'Vendor SLA tracking enabled' },
        { title: 'Ready to Dispatch', subtitle: 'Fulfillment handoff complete', meta: 'Shipment integration pending' }
      ]}
    />
  );
}
