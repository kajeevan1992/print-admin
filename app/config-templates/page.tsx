import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.config-templates"
      title="Config Templates"
      subtitle="Reusable option blueprints for dropdowns, text fields, size selectors, artwork controls, and storefront-facing configuration."
      createLabel="Add Template"
      initialItems={[
        { id: 'tpl-1', title: 'Business Cards', subtitle: 'Marketing', meta: 'size • sides • white ink • artwork notes', category: 'Marketing', fields: '4', audience: 'storefront + admin', state: 'active' },
        { id: 'tpl-2', title: 'Flyers & Leaflets', subtitle: 'Marketing', meta: 'size • folding • perforation • campaign code', category: 'Marketing', fields: '4', audience: 'storefront + admin', state: 'active' },
        { id: 'tpl-3', title: 'Booklets', subtitle: 'Booklets', meta: 'size • binding • page count • spine text', category: 'Books', fields: '4', audience: 'admin + prepress', state: 'draft' }
      ]}
      fields={[
        { key: 'category', label: 'Category' },
        { key: 'fields', label: 'Field Count', type: 'number' },
        { key: 'audience', label: 'Audience', options: ['storefront + admin', 'admin-only', 'admin + prepress'] },
        { key: 'state', label: 'State', options: ['draft', 'active', 'archived'] }
      ]}
      subtitleFields={['category', 'state']}
      cardMetaFields={['audience', 'fields']}
      searchKeys={['title', 'category', 'audience', 'state']}
    />
  );
}
