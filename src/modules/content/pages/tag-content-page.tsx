'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const items = [
  {
    id: 'tag-content-1',
    title: 'Business Essentials Tag Page',
    subtitle: 'Parent tag: None',
    meta: 'Sidebar: Enabled • Status: Published',
    tagName: 'Business Essentials',
    parentTag: 'None',
    status: 'published',
    sidebar: 'enabled',
    seoTitle: 'Business Essentials Print Products'
  },
  {
    id: 'tag-content-2',
    title: 'Event Marketing Tag Page',
    subtitle: 'Parent tag: Campaigns',
    meta: 'Sidebar: Enabled • Status: Draft',
    tagName: 'Event Marketing',
    parentTag: 'Campaigns',
    status: 'draft',
    sidebar: 'enabled',
    seoTitle: 'Event Marketing Print Collection'
  }
];

export function TagContentPage() {
  return (
    <LocalRecordsPage
      storageKey="content-tag-content"
      title="Tag Content"
      subtitle="Manage CMS, sidebar visibility, and SEO for storefront tag browse pages."
      createLabel="Add Tag Content"
      initialItems={items}
      fields={[
        { key: 'title', label: 'Tag Page Name', placeholder: 'Business Essentials Tag Page' },
        { key: 'tagName', label: 'Tag Name', placeholder: 'Business Essentials' },
        { key: 'parentTag', label: 'Browse By', placeholder: 'Campaigns' },
        { key: 'status', label: 'Status', options: ['draft', 'published'] },
        { key: 'sidebar', label: 'Sidebar', options: ['enabled', 'disabled'] },
        { key: 'seoTitle', label: 'SEO Title', placeholder: 'Business Essentials Print Products' }
      ]}
      subtitleFields={['tagName', 'status']}
      cardMetaFields={['parentTag', 'sidebar']}
      searchKeys={['title', 'tagName', 'parentTag', 'status', 'seoTitle']}
    />
  );
}
