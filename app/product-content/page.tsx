'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="content-product-pages"
      title="Product Content"
      subtitle="Manage product CMS copy, SEO emphasis, and merchandising blocks tied to storefront product pages."
      createLabel="Add Product Content"
      initialItems={[
        {
          id: 'product-content-1',
          title: 'Premium Business Cards',
          subtitle: 'published • seo-ready',
          meta: 'Business Cards • comparison block',
          productGroup: 'Business Cards',
          status: 'published',
          seoFocus: 'luxury business cards',
          contentBlock: 'comparison'
        },
        {
          id: 'product-content-2',
          title: 'Packaging Sleeve Copy',
          subtitle: 'draft • merchandising',
          meta: 'Packaging • story block',
          productGroup: 'Packaging',
          status: 'draft',
          seoFocus: 'custom packaging sleeves',
          contentBlock: 'story'
        }
      ]}
      fields={[
        { key: 'productGroup', label: 'Product Group' },
        { key: 'status', label: 'Status', options: ['draft', 'published', 'archived'] },
        { key: 'seoFocus', label: 'SEO Focus' },
        { key: 'contentBlock', label: 'Content Block', options: ['comparison', 'story', 'faq', 'specs'] }
      ]}
      subtitleFields={['status', 'contentBlock']}
      cardMetaFields={['productGroup', 'seoFocus']}
      searchKeys={['title', 'productGroup', 'status', 'seoFocus', 'contentBlock']}
    />
  );
}
