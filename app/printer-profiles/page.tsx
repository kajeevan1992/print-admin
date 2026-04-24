export const dynamic = 'force-dynamic';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.printer-profiles"
      title="Printer Profiles"
      subtitle="Map machine capability, turnaround, and routing logic so products know where they can be produced."
      createLabel="Add Printer"
      initialItems={[
        { id: 'prn-1', title: 'HP Indigo 7K', subtitle: 'Digital', meta: '330 × 482 mm', turnaround: '2', lane: 'short-run' },
        { id: 'prn-2', title: 'Xerox Iridesse', subtitle: 'Digital specialty', meta: '330 × 660 mm', turnaround: '3', lane: 'premium' },
        { id: 'prn-3', title: 'Komori Lithrone', subtitle: 'Offset', meta: '720 × 1020 mm', turnaround: '4', lane: 'volume' }
      ]}
      fields={[
        { key: 'turnaround', label: 'Turnaround Days', type: 'number' },
        { key: 'lane', label: 'Production Lane', options: ['short-run', 'premium', 'volume'] },
        { key: 'meta', label: 'Max Sheet' }
      ]}
      subtitleFields={['subtitle', 'lane']}
      cardMetaFields={['meta', 'turnaround']}
      searchKeys={['title', 'subtitle', 'lane', 'meta']}
    />
  );
}
