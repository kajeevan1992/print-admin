import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="API Keys"
      subtitle="Create and rotate API credentials for integrations and storefront automation."
      actionLabel="Generate Key"
      items={[
        { title: 'Public Storefront Key', subtitle: 'Used by headless channel clients', meta: 'Last rotated 2 days ago' },
        { title: 'Internal Fulfillment Key', subtitle: 'Restricted to order callbacks', meta: 'IP allow list enabled' },
        { title: 'Reporting Integration Key', subtitle: 'Read-only analytics export access', meta: 'Expires in 30 days' }
      ]}
    />
  );
}
