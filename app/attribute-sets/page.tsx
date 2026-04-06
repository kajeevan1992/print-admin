'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="advanced-attribute-sets"
      title="Attribute Sets"
      subtitle="Define reusable attribute bundles for categories, filters, and storefront merchandising rules."
      createLabel="Add Attribute Set"
      initialItems={[
        {
          id: 'attr-1',
          title: 'Business Cards Core',
          subtitle: 'Print + Finish',
          meta: 'Size • Stock • Finish',
          type: 'catalog',
          status: 'active',
          assignedTo: 'Business Cards',
          fieldsCount: '3',
          notes: 'Used for standard card products and trade orders.'
        },
        {
          id: 'attr-2',
          title: 'Packaging Standard',
          subtitle: 'Parametric',
          meta: 'Material • Allowance • Glue tab',
          type: 'parametric',
          status: 'active',
          assignedTo: 'Packaging',
          fieldsCount: '5',
          notes: 'Feeds product configurator and manufacturing checks.'
        },
        {
          id: 'attr-3',
          title: 'Catalog Essentials',
          subtitle: 'Booklets',
          meta: 'Pages • Binding • Paper',
          type: 'editor',
          status: 'draft',
          assignedTo: 'Catalogs',
          fieldsCount: '4',
          notes: 'Prepared for spring campaign booklet range.'
        }
      ]}
      fields={[
        { key: 'type', label: 'Type', options: ['catalog', 'editor', 'parametric'] },
        { key: 'status', label: 'Status', options: ['draft', 'active', 'archived'] },
        { key: 'assignedTo', label: 'Assigned To' },
        { key: 'fieldsCount', label: 'Fields Count', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Describe how this attribute set is used.' }
      ]}
      subtitleFields={['type', 'status']}
      cardMetaFields={['assignedTo', 'fieldsCount']}
      searchKeys={['title', 'type', 'status', 'assignedTo', 'notes']}
    />
  );
}
