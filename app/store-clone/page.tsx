'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const items = [
  {
    id: 'clone-1',
    title: 'US Main → UK Store',
    subtitle: 'Theme + content clone',
    meta: 'Queued',
    sourceStore: 'US Main',
    targetStore: 'UK Store',
    cloneScope: 'Theme + Content',
    status: 'Queued',
    preserveDomains: false,
    notes: 'Use the current live theme and copy all CMS page content for localization.'
  },
  {
    id: 'clone-2',
    title: 'Wholesale → Franchise',
    subtitle: 'Catalog-only clone',
    meta: 'In review',
    sourceStore: 'Wholesale',
    targetStore: 'Franchise',
    cloneScope: 'Catalog Only',
    status: 'In Review',
    preserveDomains: true,
    notes: 'Keep destination domain bindings and organization mappings untouched.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="ops-store-clone"
      title="Store Clone"
      subtitle="Prepare storefront cloning jobs for themes, content, navigation, and catalog configuration."
      createLabel="New Clone Job"
      initialItems={items}
      fields={[
        { key: 'subtitle', label: 'Short Description' },
        { key: 'sourceStore', label: 'Source Store' },
        { key: 'targetStore', label: 'Target Store' },
        { key: 'cloneScope', label: 'Clone Scope', options: ['Theme + Content', 'Catalog Only', 'Full Store', 'Settings Only'] },
        { key: 'status', label: 'Status', options: ['Queued', 'In Review', 'Running', 'Completed'] },
        { key: 'preserveDomains', label: 'Preserve Destination Domains', toggle: true },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Approvals, rollout windows, exclusions, or QA checklist...' }
      ]}
      subtitleFields={['subtitle']}
      cardMetaFields={['sourceStore', 'targetStore', 'status']}
      searchKeys={['title', 'subtitle', 'sourceStore', 'targetStore', 'cloneScope', 'status']}
    />
  );
}
