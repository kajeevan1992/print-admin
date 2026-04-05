import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Artwork Proofing"
      subtitle="Track proof requests, approval rounds, and customer sign-off history."
      actionLabel="New Proof Request"
      items={[
        { title: 'Order #40218', subtitle: 'Premium Catalog A4', meta: 'Awaiting customer approval' },
        { title: 'Order #40211', subtitle: 'Matte Business Card', meta: 'Vendor QA flagged trim mismatch' },
        { title: 'Order #40198', subtitle: 'Roll-up Banner', meta: 'Approved and released to production' }
      ]}
    />
  );
}
