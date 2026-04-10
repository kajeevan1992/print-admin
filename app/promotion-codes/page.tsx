export const dynamic = 'force-dynamic';

import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Promotion Codes"
      subtitle="Create promotional offers, discount windows, and campaign targeting."
      actionLabel="Add Promotion Code"
      items={[
        { title: 'SPRING10', subtitle: '10% off featured print products', meta: 'Ends Apr 30' },
        { title: 'B2B50', subtitle: 'Bulk order incentive', meta: 'Minimum subtotal required' },
        { title: 'SHIPFREE', subtitle: 'Free standard shipping', meta: 'Channel-limited campaign' }
      ]}
    />
  );
}
