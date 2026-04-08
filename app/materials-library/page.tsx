'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';
import { materials } from '@/lib/product-system-store';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.materials-library"
      title="Materials Library"
      subtitle="Manage substrates, stock families, GSM, compatibility, and surcharge inputs for the product and pricing engine."
      createLabel="Add material"
      initialItems={materials.map((material) => ({
        id: material.id,
        title: material.name,
        family: material.family,
        gsm: String(material.gsm),
        surcharge: String(material.surcharge),
        meta: `${material.family} · ${material.gsm}gsm`
      }))}
      fields={[
        { key: 'family', label: 'Family' },
        { key: 'gsm', label: 'GSM', type: 'number' },
        { key: 'surcharge', label: 'Surcharge', type: 'number' }
      ]}
      buildSubtitle={(item) => `${item.family ?? 'Stock'} · ${item.gsm ?? '0'}gsm`}
      buildCardMeta={(item) => `Surcharge £${item.surcharge ?? 0}`}
      searchKeys={['title', 'family', 'gsm']}
    />
  );
}
