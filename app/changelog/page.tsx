export const dynamic = 'force-dynamic';

import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Changelog"
      subtitle="Track administrative releases, storefront improvements, and deployment notes."
      actionLabel="Add Release Note"
      items={[
        { title: 'v1.9.3', subtitle: 'Catalog filters refined', meta: 'Released to production on Apr 2' },
        { title: 'v1.9.2', subtitle: 'Order dashboard refresh', meta: 'Added shipping status summary' },
        { title: 'v1.9.1', subtitle: 'Theme assignment updates', meta: 'Improved storefront preview handling' }
      ]}
    />
  );
}
