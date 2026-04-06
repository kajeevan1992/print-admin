'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const countries = [
  {
    id: 'country-uk',
    title: 'United Kingdom',
    subtitle: 'GB',
    meta: 'GBP • Enabled',
    isoCode: 'GB',
    currency: 'GBP',
    taxRegion: 'UK',
    shippingZone: 'Domestic',
    enabled: true,
    notes: 'Primary domestic market.'
  },
  {
    id: 'country-ie',
    title: 'Ireland',
    subtitle: 'IE',
    meta: 'EUR • Active',
    isoCode: 'IE',
    currency: 'EUR',
    taxRegion: 'EU',
    shippingZone: 'Europe',
    enabled: true,
    notes: 'Supports express and standard shipping.'
  },
  {
    id: 'country-us',
    title: 'United States',
    subtitle: 'US',
    meta: 'USD • Manual review',
    isoCode: 'US',
    currency: 'USD',
    taxRegion: 'International',
    shippingZone: 'Rest of World',
    enabled: false,
    notes: 'Pending regional tax rule rollout.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="config-country-list"
      title="Country List"
      subtitle="Control available checkout countries, regional shipping zones, currencies, and enablement."
      createLabel="Add Country"
      initialItems={countries}
      subtitleFields={['isoCode', 'currency']}
      cardMetaFields={['taxRegion', 'shippingZone']}
      searchKeys={['title', 'isoCode', 'currency', 'taxRegion']}
      fields={[
        { key: 'isoCode', label: 'ISO Code' },
        { key: 'currency', label: 'Currency' },
        { key: 'taxRegion', label: 'Tax Region' },
        { key: 'shippingZone', label: 'Shipping Zone' },
        { key: 'enabled', label: 'Enabled', toggle: true },
        { key: 'notes', label: 'Operational Notes', type: 'textarea', placeholder: 'Add rollout notes, restrictions, or compliance details...' }
      ]}
    />
  );
}
