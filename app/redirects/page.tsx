'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const items = [
  {
    id: 'redirect-1',
    title: '/old-business-cards',
    subtitle: '301 redirect to /tag/business-cards',
    meta: 'SEO migration rule',
    fromPath: '/old-business-cards',
    toPath: '/tag/business-cards',
    redirectType: '301',
    scope: 'Catalog',
    status: 'Active',
    notes: 'Preserve historical product backlinks after taxonomy updates.'
  },
  {
    id: 'redirect-2',
    title: '/summer-offer',
    subtitle: '302 redirect to promo landing page',
    meta: 'Campaign redirect',
    fromPath: '/summer-offer',
    toPath: '/landing-pages/summer-launch',
    redirectType: '302',
    scope: 'Campaign',
    status: 'Active',
    notes: 'Temporary route while seasonal campaign is running.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="ops-redirects"
      title="Redirects"
      subtitle="Create and maintain SEO redirects for changed product, category, and CMS routes."
      createLabel="Add Redirect"
      initialItems={items}
      fields={[
        { key: 'subtitle', label: 'Short Description' },
        { key: 'fromPath', label: 'From Path' },
        { key: 'toPath', label: 'To Path' },
        { key: 'redirectType', label: 'Type', options: ['301', '302', '307'] },
        { key: 'scope', label: 'Scope', options: ['Catalog', 'CMS', 'Campaign', 'Legacy'] },
        { key: 'status', label: 'Status', options: ['Active', 'Paused'] },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Reason, rollout notes, or related SEO ticket...' }
      ]}
      subtitleFields={['subtitle']}
      cardMetaFields={['fromPath', 'toPath', 'redirectType']}
      searchKeys={['title', 'subtitle', 'fromPath', 'toPath', 'scope', 'status']}
    />
  );
}
