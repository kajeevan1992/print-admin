'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const items = [
  {
    id: 'pp-1',
    title: 'Mailer Box 0427',
    subtitle: 'Small ecommerce foldable mailer',
    meta: 'Packaging · Active',
    standard: 'FEFCO 0427',
    size: '220 x 160 x 70',
    material: 'E flute',
    category: 'Packaging',
    status: 'Active',
    storefrontVisible: true,
    notes: 'Used for cosmetics and small subscription shipments.'
  },
  {
    id: 'pp-2',
    title: 'Counter Display Stand',
    subtitle: 'Retail countertop unit',
    meta: 'POS · Draft',
    standard: 'Display Stand',
    size: 'Custom',
    material: 'B flute',
    category: 'Signage',
    status: 'Draft',
    storefrontVisible: false,
    notes: 'Awaiting final dieline validation before publishing.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="module-parametric-products"
      title="Parametric Products"
      subtitle="Manage solved standards, storefront exposure, linked categories, and material presets for parametric catalog items."
      createLabel="Add Parametric Product"
      initialItems={items}
      fields={[
        { key: 'subtitle', label: 'Short Description' },
        { key: 'standard', label: 'Standard' },
        { key: 'size', label: 'Size / Variant' },
        { key: 'material', label: 'Material', options: ['E flute', 'B flute', 'Kraft', 'Folding Carton'] },
        { key: 'category', label: 'Linked Category', options: ['Packaging', 'Signage', 'Display', 'Boxes'] },
        { key: 'status', label: 'Status', options: ['Active', 'Draft', 'Archived'] },
        { key: 'storefrontVisible', label: 'Visible on Storefront', toggle: true },
        { key: 'notes', label: 'Product Notes', type: 'textarea', placeholder: 'Add material constraints, minimum dimensions, and pricing notes...' }
      ]}
      cardMetaFields={['standard', 'material', 'status']}
      searchKeys={['title', 'subtitle', 'standard', 'material', 'category', 'status']}
    />
  );
}
