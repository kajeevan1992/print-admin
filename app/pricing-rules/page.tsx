export const dynamic = 'force-dynamic';

import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Pricing Rules"
      subtitle="Configure conditional surcharges, quantity breaks, and channel-specific pricing rules."
      actionLabel="Add Rule"
      items={[
        { title: 'Rush Turnaround Surcharge', subtitle: 'Adds 25% when turnaround < 48h', meta: 'Applies to catalogs and flyers' },
        { title: 'B2B Wholesale Card Discount', subtitle: '10% off above 5,000 units', meta: 'Channel: Wholesale API' },
        { title: 'Oversize Banner Handling', subtitle: 'Flat setup fee for large-format jobs', meta: 'Signage category only' }
      ]}
    />
  );
}
