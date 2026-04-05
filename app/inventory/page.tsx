import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Inventory"
      subtitle="Monitor stock pools, reorder points, and warehouse availability snapshots."
      actionLabel="Add Inventory Rule"
      items={[
        { title: 'Nevada DC', subtitle: 'On-hand sync every 30 min', meta: 'Low stock alerts active' },
        { title: 'New Jersey Hub', subtitle: 'Trade jobs only', meta: 'Shared with signage line' },
        { title: 'Texas Plant', subtitle: 'Raw material availability', meta: 'Production linked' }
      ]}
    />
  );
}
