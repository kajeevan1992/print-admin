import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.finish-library"
      title="Finish Library"
      subtitle="Manage laminate, coating, foil, UV, folding, and binding outcomes with pricing and setup awareness."
      createLabel="Add Finish"
      initialItems={[
        { id: 'fin-1', title: 'Matt laminate', subtitle: 'Laminate', meta: 'Soft premium protection', surcharge: '6', setupFee: '10', complexity: 'normal' },
        { id: 'fin-2', title: 'Soft touch laminate', subtitle: 'Premium', meta: 'Luxury tactile finish', surcharge: '9', setupFee: '14', complexity: 'premium' },
        { id: 'fin-3', title: 'Spot UV', subtitle: 'Premium', meta: 'Selective gloss highlight', surcharge: '18', setupFee: '30', complexity: 'specialty' }
      ]}
      fields={[
        { key: 'surcharge', label: 'Surcharge', type: 'number' },
        { key: 'setupFee', label: 'Setup Fee', type: 'number' },
        { key: 'complexity', label: 'Complexity', options: ['normal', 'premium', 'specialty'] }
      ]}
      subtitleFields={['subtitle', 'complexity']}
      cardMetaFields={['surcharge', 'setupFee']}
      searchKeys={['title', 'subtitle', 'complexity']}
    />
  );
}
