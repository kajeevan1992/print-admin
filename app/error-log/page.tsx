import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Error Log"
      subtitle="Monitor storefront and admin exceptions, warnings, and integration failures."
      actionLabel="Create Incident"
      items={[
        { title: 'Checkout validation spike', subtitle: '17 occurrences in last hour', meta: 'Severity: medium' },
        { title: 'Webhook retry failures', subtitle: 'Payment callback timeout', meta: 'Severity: high' },
        { title: 'Image render warning', subtitle: 'Proof service fallback used', meta: 'Severity: low' }
      ]}
    />
  );
}
