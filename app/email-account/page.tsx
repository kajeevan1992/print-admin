export const dynamic = 'force-dynamic';

import { ConfigWorkspacePage } from '@/components/configuration/config-workspace-page';

export default function Page() {
  return (
    <ConfigWorkspacePage
      storageKey="config-email-account"
      title="Email Account"
      subtitle="Manage outbound sender identity and SMTP-style operational settings."
      sections={[
        {
          title: 'Primary Settings',
          fields: [
            { key: 'primaryName', label: 'Primary Name', placeholder: 'Email Account profile' },
            { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Active', 'Disabled'] },
            { key: 'owner', label: 'Owner', placeholder: 'Operations team' },
            { key: 'enabled', label: 'Enabled', type: 'toggle' }
          ]
        },
        {
          title: 'Operational Notes',
          fields: [
            { key: 'contact', label: 'Contact', placeholder: 'ops@example.com' },
            { key: 'reference', label: 'Reference', placeholder: 'REF-001' },
            { key: 'reviewCycle', label: 'Review Cycle', type: 'select', options: ['Weekly', 'Monthly', 'Quarterly'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Add internal notes, procedures, and exceptions...' }
          ]
        }
      ]}
    />
  );
}
