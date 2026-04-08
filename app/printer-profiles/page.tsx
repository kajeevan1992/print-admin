'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';
import { printerProfiles } from '@/lib/product-system-store';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.printer-profiles"
      title="Printer Profiles"
      subtitle="Manage device capability, technology, max sheet size, and routing inputs so the catalog reflects real production capacity."
      createLabel="Add printer"
      initialItems={printerProfiles.map((printer) => ({
        id: printer.id,
        title: printer.name,
        technology: printer.technology,
        maxSheet: printer.maxSheet,
        turnaroundDays: String(printer.turnaroundDays),
        meta: `${printer.technology} · ${printer.maxSheet}`
      }))}
      fields={[
        { key: 'technology', label: 'Technology' },
        { key: 'maxSheet', label: 'Max sheet' },
        { key: 'turnaroundDays', label: 'Turnaround days', type: 'number' }
      ]}
      buildSubtitle={(item) => `${item.technology ?? 'Print'} · ${item.maxSheet ?? 'Unknown size'}`}
      buildCardMeta={(item) => `${item.turnaroundDays ?? '0'} day turnaround`}
      searchKeys={['title', 'technology', 'maxSheet']}
    />
  );
}
