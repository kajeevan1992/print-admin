import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.materials-library"
      title="Materials Library"
      subtitle="Centralize substrate logic so products, printer routing, and pricing all speak the same material language."
      createLabel="Add Material"
      initialItems={[
        { id: 'mat-1', title: '350gsm Silk', subtitle: 'Coated stock', meta: 'Digital premium jobs', gsm: '350', surcharge: '0', printerFamily: 'HP Indigo / Xerox', state: 'active' },
        { id: 'mat-2', title: '300gsm Uncoated', subtitle: 'Uncoated stock', meta: 'Stationery / natural feel', gsm: '300', surcharge: '2', printerFamily: 'HP Indigo / Offset', state: 'active' },
        { id: 'mat-3', title: '170gsm Silk', subtitle: 'Flyer stock', meta: 'High-volume promotional sheets', gsm: '170', surcharge: '1', printerFamily: 'Digital / Offset', state: 'active' }
      ]}
      fields={[
        { key: 'gsm', label: 'GSM', type: 'number' },
        { key: 'surcharge', label: 'Surcharge', type: 'number' },
        { key: 'printerFamily', label: 'Printer Family' },
        { key: 'state', label: 'State', options: ['active', 'testing', 'retired'] }
      ]}
      subtitleFields={['subtitle', 'state']}
      cardMetaFields={['gsm', 'printerFamily']}
      searchKeys={['title', 'subtitle', 'printerFamily', 'state']}
    />
  );
}
