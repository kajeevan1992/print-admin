export const dynamic = 'force-dynamic';

import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Store Clone"
      subtitle="Clone settings, themes, and catalog structure from one store to another."
      actionLabel="New Clone Job"
      items={[
        { title: 'US Main → UK Store', subtitle: 'Theme + content clone', meta: 'Queued' },
        { title: 'Wholesale → Franchise', subtitle: 'Catalog-only clone', meta: 'In review' },
        { title: 'Seasonal Promo Store', subtitle: 'Rapid launch template', meta: 'Completed last week' }
      ]}
    />
  );
}
