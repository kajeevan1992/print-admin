export const dynamic = 'force-dynamic';

import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Country List"
      subtitle="Manage enabled storefront countries and region availability."
      actionLabel="Add Country"
      items={[
        { title: 'United States', subtitle: 'Primary B2C region', meta: 'Tax + shipping configured' },
        { title: 'United Kingdom', subtitle: 'VAT rules applied', meta: 'Currency override enabled' },
        { title: 'Germany', subtitle: 'EU shipping zone', meta: 'Translation draft in progress' }
      ]}
    />
  );
}
