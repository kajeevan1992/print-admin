export const dynamic = 'force-dynamic';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.production-routing-lab"
      title="Production Routing Lab"
      subtitle="Model which printers, finishes, and turnaround paths should be used for each product family and stock combination."
      createLabel="Add Routing Rule"
      initialItems={[
        { id: 'route-1', title: 'Business cards on silk', subtitle: 'cards • standard', meta: 'HP Indigo 7K → spot UV on Xerox Iridesse', family: 'cards', stock: '350gsm Silk', route: 'HP Indigo 7K', fallback: 'Xerox Iridesse', state: 'active' },
        { id: 'route-2', title: 'Booklets long run', subtitle: 'books • priority', meta: 'Komori Lithrone preferred for 1000+', family: 'books', stock: '130gsm Silk', route: 'Komori Lithrone', fallback: 'HP Indigo 7K', state: 'active' }
      ]}
      fields={[
        { key: 'family', label: 'Family', options: ['cards', 'leaflets', 'books'] },
        { key: 'stock', label: 'Stock' },
        { key: 'route', label: 'Primary Route' },
        { key: 'fallback', label: 'Fallback Route' },
        { key: 'state', label: 'State', options: ['draft', 'active', 'archived'] }
      ]}
      subtitleFields={['family', 'state']}
      cardMetaFields={['stock', 'route', 'fallback']}
      searchKeys={['title', 'family', 'stock', 'route', 'fallback']}
      liveEndpoint="/api/internal/catalog/production-routing-rules"
    />
  );
}
