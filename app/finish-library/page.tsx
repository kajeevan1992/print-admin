'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';
import { finishes } from '@/lib/product-system-store';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.finish-library"
      title="Finish Library"
      subtitle="Create laminations, coatings, premium finishes, setup fees, and production notes that can be linked to products and prices."
      createLabel="Add finish"
      initialItems={finishes.map((finish) => ({
        id: finish.id,
        title: finish.name,
        family: finish.family,
        surcharge: String(finish.surcharge),
        setupFee: String(finish.setupFee),
        meta: `${finish.family} · £${finish.surcharge} uplift`
      }))}
      fields={[
        { key: 'family', label: 'Family' },
        { key: 'surcharge', label: 'Surcharge', type: 'number' },
        { key: 'setupFee', label: 'Setup fee', type: 'number' }
      ]}
      buildSubtitle={(item) => `${item.family ?? 'Finish'} · £${item.surcharge ?? 0} uplift`}
      buildCardMeta={(item) => `Setup fee £${item.setupFee ?? 0}`}
      searchKeys={['title', 'family']}
    />
  );
}
