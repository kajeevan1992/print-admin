'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const items = [
  {
    id: 'binding-1',
    title: 'print.example.com',
    subtitle: 'Primary production domain',
    meta: 'SSL verified',
    storefront: 'Main Store',
    hostname: 'print.example.com',
    target: 'main-storefront',
    status: 'Active',
    ssl: true,
    notes: 'Primary customer-facing storefront with checkout enabled.'
  },
  {
    id: 'binding-2',
    title: 'wholesale.example.com',
    subtitle: 'B2B wholesale portal',
    meta: 'Awaiting DNS cutover',
    storefront: 'Wholesale',
    hostname: 'wholesale.example.com',
    target: 'wholesale-storefront',
    status: 'Pending',
    ssl: false,
    notes: 'Route traffic to the dedicated wholesale catalog and login experience.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="ops-site-bindings"
      title="Site Bindings"
      subtitle="Manage custom domains, storefront hostnames, SSL readiness, and routing targets."
      createLabel="Add Binding"
      initialItems={items}
      fields={[
        { key: 'subtitle', label: 'Short Description' },
        { key: 'storefront', label: 'Storefront' },
        { key: 'hostname', label: 'Hostname' },
        { key: 'target', label: 'Target App / Store' },
        { key: 'status', label: 'Status', options: ['Active', 'Pending', 'Disabled'] },
        { key: 'ssl', label: 'SSL Enabled', toggle: true },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'DNS notes, certificate details, rollout comments...' }
      ]}
      subtitleFields={['subtitle']}
      cardMetaFields={['storefront', 'hostname', 'status']}
      searchKeys={['title', 'subtitle', 'storefront', 'hostname', 'target', 'status']}
    />
  );
}
