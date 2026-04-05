import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Merchant Accounts"
      subtitle="Manage payment merchant profiles, gateways, and settlement routing."
      actionLabel="Add Merchant Account"
      items={[
        { title: 'Stripe Primary', subtitle: 'Online card processing', meta: 'Live mode enabled' },
        { title: 'BACS Invoice Gateway', subtitle: 'Manual settlement workflow', meta: 'Finance team owner' },
        { title: 'PayPal Express', subtitle: 'Fallback checkout option', meta: 'Sandbox disabled' }
      ]}
    />
  );
}
