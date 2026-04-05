import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Parametric Rules Engine"
      subtitle="Manage logical rules that constrain dimensions, materials, and print options."
      actionLabel="Add Engine Rule"
      items={[
        { title: 'Max Width Constraint', subtitle: 'Reject widths above machine tolerance', meta: 'Applies to carton products' },
        { title: 'Material Compatibility Matrix', subtitle: 'Restricts unsupported material + allowance pairs', meta: 'Shared library rule' },
        { title: 'Auto Upsell Logic', subtitle: 'Suggest premium stock above area threshold', meta: 'Storefront helper rule' }
      ]}
    />
  );
}
