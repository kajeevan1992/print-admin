'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="advanced-inventory-rules"
      title="Inventory"
      subtitle="Monitor stock pools, reorder points, and warehouse availability used by storefront and production workflows."
      createLabel="Add Inventory Rule"
      initialItems={[
        {
          id: 'inv-1',
          title: 'Nevada DC',
          subtitle: 'Warehouse • active',
          meta: 'Low stock alerts • 30 min sync',
          locationType: 'warehouse',
          status: 'active',
          skuGroup: 'Core Print Stock',
          threshold: '250',
          notes: 'Handles west-coast card stock and envelope replenishment.'
        },
        {
          id: 'inv-2',
          title: 'New Jersey Hub',
          subtitle: 'Trade only • active',
          meta: 'Shared capacity • Routed jobs',
          locationType: 'plant',
          status: 'active',
          skuGroup: 'Trade Jobs',
          threshold: '100',
          notes: 'Reserved for reseller and managed-account products.'
        },
        {
          id: 'inv-3',
          title: 'Texas Plant',
          subtitle: 'Materials • review',
          meta: 'Paper board • Production linked',
          locationType: 'materials',
          status: 'review',
          skuGroup: 'Raw Board',
          threshold: '75',
          notes: 'Awaiting new vendor lead-time confirmation.'
        }
      ]}
      fields={[
        { key: 'locationType', label: 'Location Type', options: ['warehouse', 'plant', 'materials'] },
        { key: 'status', label: 'Status', options: ['active', 'review', 'paused'] },
        { key: 'skuGroup', label: 'SKU Group' },
        { key: 'threshold', label: 'Reorder Threshold', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Operational notes and replenishment rules.' }
      ]}
      subtitleFields={['locationType', 'status']}
      cardMetaFields={['skuGroup', 'threshold']}
      searchKeys={['title', 'locationType', 'status', 'skuGroup', 'notes']}
    />
  );
}
