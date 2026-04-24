export const dynamic = 'force-dynamic';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.artwork-preflight-studio"
      title="Artwork Preflight Studio"
      subtitle="Define artwork readiness profiles, proof mode, and production checks so products launch with fewer prepress surprises."
      createLabel="Add Profile"
      initialItems={[
        { id: 'art-1', title: 'Marketing standard', subtitle: 'soft-proof', meta: 'Bleed • CMYK • fonts • DPI', risk: 'normal', audience: 'studio' },
        { id: 'art-2', title: 'Booklet production', subtitle: 'hard-proof', meta: 'Pagination • creep • binding', risk: 'high', audience: 'prepress + client' }
      ]}
      fields={[
        { key: 'risk', label: 'Risk', options: ['normal', 'high', 'critical'] },
        { key: 'audience', label: 'Audience', options: ['studio', 'prepress', 'prepress + client'] },
        { key: 'meta', label: 'Checklist', type: 'textarea' }
      ]}
      subtitleFields={['subtitle', 'risk']}
      cardMetaFields={['audience']}
      searchKeys={['title', 'subtitle', 'risk', 'audience', 'meta']}
    />
  );
}
