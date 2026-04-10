'use client';


export const dynamic = 'force-dynamic';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="content-tag-pages"
      title="Tag Content"
      subtitle="Manage SEO and support copy for tag landing pages used for browse filters and cross-category discovery."
      createLabel="Add Tag Content"
      initialItems={[
        {
          id: 'tag-content-1',
          title: 'Business Cards',
          subtitle: 'published • sidebar',
          meta: 'tag/business-cards • seo priority',
          slug: 'tag/business-cards',
          status: 'published',
          sidebar: 'yes',
          seoFocus: 'business cards printing'
        },
        {
          id: 'tag-content-2',
          title: 'Packaging',
          subtitle: 'draft • sidebar',
          meta: 'tag/packaging • growth page',
          slug: 'tag/packaging',
          status: 'draft',
          sidebar: 'yes',
          seoFocus: 'custom packaging print'
        }
      ]}
      fields={[
        { key: 'slug', label: 'Slug' },
        { key: 'status', label: 'Status', options: ['draft', 'published', 'archived'] },
        { key: 'sidebar', label: 'Sidebar', options: ['yes', 'no'] },
        { key: 'seoFocus', label: 'SEO Focus' }
      ]}
      subtitleFields={['status', 'sidebar']}
      cardMetaFields={['slug', 'seoFocus']}
      searchKeys={['title', 'slug', 'status', 'sidebar', 'seoFocus']}
    />
  );
}
