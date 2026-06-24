'use client';

export const dynamic = 'force-dynamic';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="advanced-error-log"
      title="Error Log"
      subtitle="Monitor storefront and admin exceptions, warnings, integration failures, and operational incidents. No dummy incidents are preloaded."
      createLabel="Create Incident"
      initialItems={[]}
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
