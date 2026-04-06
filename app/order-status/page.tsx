'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="advanced-order-statuses"
      title="Order Status"
      subtitle="Customize status pipeline labels used by order management, production, and customer notifications."
      createLabel="Add Status"
      initialItems={[
        {
          id: 'status-1',
          title: 'Awaiting Artwork',
          subtitle: 'pre-production • customer action',
          meta: 'Email trigger • Proof blocked',
          stage: 'pre-production',
          visibility: 'customer-visible',
          color: 'amber',
          slaHours: '24',
          notes: 'Used when uploads or editor confirmation are still required.'
        },
        {
          id: 'status-2',
          title: 'In Production',
          subtitle: 'production • internal',
          meta: 'Board queue • Plant routed',
          stage: 'production',
          visibility: 'customer-visible',
          color: 'blue',
          slaHours: '48',
          notes: 'Displayed once job ticket reaches print or finishing.'
        },
        {
          id: 'status-3',
          title: 'Ready to Dispatch',
          subtitle: 'fulfilment • customer',
          meta: 'Shipment handoff • Tracking pending',
          stage: 'fulfilment',
          visibility: 'customer-visible',
          color: 'green',
          slaHours: '12',
          notes: 'Shown after QA pass and before courier scan.'
        }
      ]}
      fields={[
        { key: 'stage', label: 'Stage', options: ['pre-production', 'production', 'qa', 'fulfilment'] },
        { key: 'visibility', label: 'Visibility', options: ['internal-only', 'customer-visible'] },
        { key: 'color', label: 'Color', options: ['amber', 'blue', 'green', 'red', 'neutral'] },
        { key: 'slaHours', label: 'Target Hours', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notification and workflow notes.' }
      ]}
      subtitleFields={['stage', 'visibility']}
      cardMetaFields={['color', 'slaHours']}
      searchKeys={['title', 'stage', 'visibility', 'color', 'notes']}
    />
  );
}
