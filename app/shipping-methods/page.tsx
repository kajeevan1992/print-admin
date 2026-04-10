export const dynamic = 'force-dynamic';

import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Shipping Methods"
      subtitle="Configure available delivery methods, production handoff, and shipping rules."
      actionLabel="Add Shipping Method"
      items={[
        { title: 'Standard Delivery', subtitle: '3-5 business days', meta: 'Visible on all stores' },
        { title: 'Express Delivery', subtitle: 'Next-day eligible SKUs only', meta: 'Rush fee enabled' },
        { title: 'Local Pickup', subtitle: 'Warehouse pickup slots', meta: 'Store-specific availability' }
      ]}
    />
  );
}
