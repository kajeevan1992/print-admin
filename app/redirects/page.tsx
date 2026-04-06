import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Redirects"
      subtitle="Manage URL redirects for changed category, product, and CMS routes."
      actionLabel="Add Redirect"
      items={[
        { title: '/old-business-cards', subtitle: '301 to /tag/business-cards', meta: 'SEO migration rule' },
        { title: '/legacy/catalogs', subtitle: '302 to /categories/catalogs', meta: 'Temporary campaign redirect' },
        { title: '/summer-offer', subtitle: '301 to /page-content/summer-offer', meta: 'Landing page archive' }
      ]}
    />
  );
}
