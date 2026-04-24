export const dynamic = 'force-dynamic';

import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      storageKey="config-clean-up-manager"
      title="Clean Up Manager"
      subtitle="Review stale assets, abandoned records, and scheduled cleanup routines."
      actionLabel="Run Cleanup"
      items={[
        { title: 'Unused proof files', subtitle: '184 candidates older than 90 days', meta: 'Dry run available' },
        { title: 'Archived carts', subtitle: 'B2C carts older than 45 days', meta: 'Safe delete rule' },
        { title: 'Thumbnail cache', subtitle: 'Orphaned previews detected', meta: 'Batch purge ready' }
      ]}
    />
  );
}
