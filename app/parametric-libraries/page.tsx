'use client';


export const dynamic = 'force-dynamic';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const items = [
  {
    id: 'lib-1',
    title: 'Packaging Standards',
    subtitle: 'Core FEFCO and mailer library',
    meta: '18 assets · Synced',
    libraryType: 'Standards',
    itemCount: '18',
    owner: 'Packaging Team',
    syncStatus: 'Synced',
    environment: 'Production',
    editable: true,
    notes: 'Primary production-grade standards used across packaging storefronts.'
  },
  {
    id: 'lib-2',
    title: 'Retail Display Assets',
    subtitle: 'Counter display and shelf-ready units',
    meta: '7 assets · Review',
    libraryType: 'Display',
    itemCount: '7',
    owner: 'POS Team',
    syncStatus: 'Review',
    environment: 'Staging',
    editable: false,
    notes: 'Pending review for updated fold geometry and dimensional constraints.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="module-parametric-libraries"
      title="Parametric Libraries"
      subtitle="Track reusable geometry assets, solved templates, and shared standard libraries for Print CAD operations."
      createLabel="Add Library"
      initialItems={items}
      fields={[
        { key: 'subtitle', label: 'Description' },
        { key: 'libraryType', label: 'Library Type', options: ['Standards', 'Display', 'Materials', 'Dielines'] },
        { key: 'itemCount', label: 'Item Count', type: 'number' },
        { key: 'owner', label: 'Owner Team' },
        { key: 'syncStatus', label: 'Sync Status', options: ['Synced', 'Review', 'Draft'] },
        { key: 'environment', label: 'Environment', options: ['Production', 'Staging', 'Sandbox'] },
        { key: 'editable', label: 'Editable', toggle: true },
        { key: 'notes', label: 'Library Notes', type: 'textarea', placeholder: 'Add sync details, publishing notes, and downstream dependencies...' }
      ]}
      cardMetaFields={['libraryType', 'itemCount', 'syncStatus']}
      searchKeys={['title', 'subtitle', 'libraryType', 'owner', 'syncStatus', 'environment']}
    />
  );
}
