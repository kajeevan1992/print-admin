'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const items = [
  {
    id: 'vendor-1',
    title: 'BlueLine Print',
    subtitle: 'Offset + digital production',
    meta: 'Primary catalog vendor · SLA 48h',
    contactName: 'Rachel Ford',
    email: 'rachel@blueline.example',
    phone: '+1 555 240 110',
    region: 'North America',
    capability: 'Catalogs',
    status: 'Active',
    proofingRequired: true,
    notes: 'Handles stitched brochures, direct mail, and trade catalog batching.'
  },
  {
    id: 'vendor-2',
    title: 'NorthPress',
    subtitle: 'Large format and signage',
    meta: 'Trade-only routing enabled',
    contactName: 'Owen Perez',
    email: 'ops@northpress.example',
    phone: '+1 555 240 220',
    region: 'United Kingdom',
    capability: 'Signage',
    status: 'Active',
    proofingRequired: false,
    notes: 'Used for event graphics, pull-up banners, and short-run signage.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="module-vendors"
      title="Trade Vendors"
      subtitle="Manage production partners, routing contacts, proofing preferences, and regional vendor coverage."
      createLabel="Add Vendor"
      initialItems={items}
      fields={[
        { key: 'subtitle', label: 'Short Description' },
        { key: 'contactName', label: 'Primary Contact' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'region', label: 'Region', options: ['North America', 'United Kingdom', 'Europe', 'APAC'] },
        { key: 'capability', label: 'Capability', options: ['Catalogs', 'Cards', 'Signage', 'Packaging'] },
        { key: 'status', label: 'Status', options: ['Active', 'Onboarding', 'Paused'] },
        { key: 'proofingRequired', label: 'Proofing Required', toggle: true },
        { key: 'notes', label: 'Operational Notes', type: 'textarea', placeholder: 'Add production notes, SLAs, and routing specifics...' }
      ]}
      searchKeys={['title', 'subtitle', 'contactName', 'region', 'capability', 'status']}
    />
  );
}
