'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const items = [
  {
    id: 'product-content-1',
    title: 'Business Cards Content',
    subtitle: 'SEO + merchandising copy',
    meta: 'Template: Product detail • Status: Published',
    slug: 'business-cards',
    template: 'product-detail',
    status: 'published',
    seoTitle: 'Premium Business Cards',
    sectionCount: '6'
  },
  {
    id: 'product-content-2',
    title: 'Flyers Content',
    subtitle: 'Promotional product landing content',
    meta: 'Template: Product detail • Status: Draft',
    slug: 'flyers',
    template: 'product-detail',
    status: 'draft',
    seoTitle: 'Custom Flyers Printing',
    sectionCount: '4'
  }
];

export function ProductContentPage() {
  return (
    <LocalRecordsPage
      storageKey="content-product-content"
      title="Product Content"
      subtitle="Manage CMS copy, merchandising blocks, and SEO settings used on product detail pages."
      createLabel="Add Product Content"
      initialItems={items}
      fields={[
        { key: 'title', label: 'Product Page Name', placeholder: 'Enter page name' },
        { key: 'slug', label: 'Product Slug', placeholder: 'business-cards' },
        { key: 'template', label: 'Template', options: ['product-detail', 'campaign-product', 'comparison'] },
        { key: 'status', label: 'Status', options: ['draft', 'published', 'scheduled'] },
        { key: 'seoTitle', label: 'SEO Title', placeholder: 'Premium Business Cards' },
        { key: 'sectionCount', label: 'Content Sections', type: 'number', placeholder: '6' }
      ]}
      subtitleFields={['template', 'status']}
      cardMetaFields={['slug', 'seoTitle']}
      searchKeys={['title', 'slug', 'seoTitle', 'template', 'status']}
    />
  );
}
