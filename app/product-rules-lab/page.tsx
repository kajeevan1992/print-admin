import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.product-rules-lab"
      title="Product Rules Lab"
      subtitle="Model conditional option logic, field visibility, printer compatibility, and storefront-facing configuration rules."
      createLabel="Add Rule"
      initialItems={[
        { id: 'rule-1', title: 'Business cards square variant', subtitle: 'business-cards', meta: 'If size = 65x65, show white ink field', trigger: 'size = 65x65', effect: 'Show whiteInk field', audience: 'storefront + admin', state: 'active' },
        { id: 'rule-2', title: 'Perfect bound booklet spine', subtitle: 'booklets', meta: 'If binding = perfect, require spine text', trigger: 'binding = perfect', effect: 'Require spineText', audience: 'prepress', state: 'active' }
      ]}
      fields={[
        { key: 'trigger', label: 'Trigger' },
        { key: 'effect', label: 'Effect', type: 'textarea' },
        { key: 'audience', label: 'Audience', options: ['storefront + admin', 'admin-only', 'prepress'] },
        { key: 'state', label: 'State', options: ['draft', 'active', 'archived'] }
      ]}
      subtitleFields={['subtitle', 'state']}
      cardMetaFields={['trigger', 'audience']}
      searchKeys={['title', 'subtitle', 'trigger', 'effect', 'audience']}
    />
  );
}
