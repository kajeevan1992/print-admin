'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="advanced-error-log"
      title="Error Log"
      subtitle="Monitor storefront and admin exceptions, warnings, integration failures, and operational incidents."
      createLabel="Create Incident"
      initialItems={[
        {
          id: 'err-1',
          title: 'Checkout validation spike',
          subtitle: 'medium • storefront',
          meta: '17 occurrences • last hour',
          severity: 'medium',
          area: 'storefront',
          owner: 'Checkout Team',
          status: 'investigating',
          notes: 'Promo code validation is intermittently rejecting valid postcode combinations.'
        },
        {
          id: 'err-2',
          title: 'Webhook retry failures',
          subtitle: 'high • payments',
          meta: 'Timeouts • callback retries',
          severity: 'high',
          area: 'payments',
          owner: 'Platform Ops',
          status: 'open',
          notes: 'Merchant callback latency exceeded SLA during peak quote imports.'
        },
        {
          id: 'err-3',
          title: 'Image render warning',
          subtitle: 'low • proofing',
          meta: 'Fallback used • proof service',
          severity: 'low',
          area: 'proofing',
          owner: 'Render Service',
          status: 'monitoring',
          notes: 'Low-res proof fallback triggered for one template family.'
        }
      ]}
      fields={[
        { key: 'severity', label: 'Severity', options: ['low', 'medium', 'high', 'critical'] },
        { key: 'area', label: 'Area', options: ['storefront', 'payments', 'proofing', 'production', 'admin'] },
        { key: 'owner', label: 'Owner' },
        { key: 'status', label: 'Status', options: ['open', 'investigating', 'monitoring', 'resolved'] },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Root cause, incident notes, remediation updates.' }
      ]}
      subtitleFields={['severity', 'area']}
      cardMetaFields={['owner', 'status']}
      searchKeys={['title', 'severity', 'area', 'owner', 'status', 'notes']}
    />
  );
}
