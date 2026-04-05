import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Attribute Sets"
      subtitle="Define reusable attribute bundles for categories and product filtering."
      actionLabel="Add Attribute Set"
      items={[
        { title: 'Business Cards Core', subtitle: 'Size, stock, finish', meta: 'Assigned to 2 categories' },
        { title: 'Packaging Standard', subtitle: 'Material, allowance, glue tab', meta: 'Used by parametric products' },
        { title: 'Catalog Essentials', subtitle: 'Pages, binding, paper', meta: 'B2B catalog ready' }
      ]}
    />
  );
}
