export const dynamic = 'force-dynamic';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.option-sets"
      title="Option Sets"
      subtitle="Reusable dropdown packs for sizes, paper choices, finishes, bindings, and delivery selections across the product builder."
      createLabel="Add Option Set"
      initialItems={[
        { id: 'opt-1', title: 'Card sizes', subtitle: 'sizes • active', meta: '85x55 • 90x50 • 65x65', scope: 'storefront + admin', values: '3', state: 'active' },
        { id: 'opt-2', title: 'Lamination finishes', subtitle: 'finishes • active', meta: 'matt • gloss • soft touch', scope: 'admin + pricing', values: '3', state: 'active' }
      ]}
      fields={[
        { key: 'scope', label: 'Scope', options: ['storefront + admin', 'admin + pricing', 'admin-only'] },
        { key: 'values', label: 'Value Count', type: 'number' },
        { key: 'state', label: 'State', options: ['draft', 'active', 'archived'] }
      ]}
      subtitleFields={['subtitle']}
      cardMetaFields={['scope', 'values']}
      searchKeys={['title', 'scope', 'state', 'meta']}
      liveEndpoint="/api/internal/catalog/option-sets"
    />
  );
}
