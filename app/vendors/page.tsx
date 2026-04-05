import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Trade Vendors"
      subtitle="Manage vendor records, production partners, and fulfillment contacts."
      actionLabel="Add Vendor"
      items={[
        { title: 'BlueLine Print', subtitle: 'Offset + digital production', meta: 'Primary catalog vendor · SLA 48h' },
        { title: 'NorthPress', subtitle: 'Large format and signage', meta: 'Trade-only routing enabled' },
        { title: 'PrintWave', subtitle: 'Wholesale cards and stationery', meta: 'Shared proofs + batching' }
      ]}
    />
  );
}
