import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Site Bindings"
      subtitle="Maintain custom domain bindings and host mappings for each storefront."
      actionLabel="Add Binding"
      items={[
        { title: 'print.example.com', subtitle: 'Primary production domain', meta: 'SSL verified' },
        { title: 'wholesale.example.com', subtitle: 'Headless B2B channel', meta: 'API origin approved' },
        { title: 'uk.print.example.com', subtitle: 'Regional store domain', meta: 'Awaiting DNS cutover' }
      ]}
    />
  );
}
