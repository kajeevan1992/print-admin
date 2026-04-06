'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const methods = [
  {
    id: 'ship-standard',
    title: 'Standard Delivery',
    subtitle: 'Ground • 3-5 business days',
    meta: 'Domestic • Active',
    carrier: 'Royal Mail',
    serviceLevel: 'Standard',
    cutoffTime: '14:00',
    costRule: 'Flat rate',
    regions: 'UK Mainland',
    active: true,
    notes: 'Default shipping method for most catalog products.'
  },
  {
    id: 'ship-express',
    title: 'Express Delivery',
    subtitle: 'Priority • Next business day',
    meta: 'Rush eligible',
    carrier: 'DHL',
    serviceLevel: 'Express',
    cutoffTime: '12:00',
    costRule: 'Dynamic by weight',
    regions: 'UK Mainland, EU',
    active: true,
    notes: 'Restrict to stocked and rush-capable SKUs.'
  },
  {
    id: 'ship-pickup',
    title: 'Local Pickup',
    subtitle: 'Collection from print facility',
    meta: 'No courier charge',
    carrier: 'In-house',
    serviceLevel: 'Pickup',
    cutoffTime: '17:00',
    costRule: 'Free',
    regions: 'London only',
    active: false,
    notes: 'Requires pickup slot confirmation.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="config-shipping-methods"
      title="Shipping Methods"
      subtitle="Configure available delivery methods, carrier rules, cutoffs, and storefront visibility."
      createLabel="Add Shipping Method"
      initialItems={methods}
      subtitleFields={['carrier', 'serviceLevel']}
      cardMetaFields={['regions', 'costRule']}
      searchKeys={['title', 'carrier', 'serviceLevel', 'regions']}
      fields={[
        { key: 'carrier', label: 'Carrier' },
        { key: 'serviceLevel', label: 'Service Level', options: ['Standard', 'Express', 'Pickup', 'Freight'] },
        { key: 'cutoffTime', label: 'Cutoff Time' },
        { key: 'costRule', label: 'Cost Rule' },
        { key: 'regions', label: 'Regions' },
        { key: 'active', label: 'Active', toggle: true },
        { key: 'notes', label: 'Operational Notes', type: 'textarea', placeholder: 'Add routing notes, eligibility rules, or exceptions...' }
      ]}
    />
  );
}
