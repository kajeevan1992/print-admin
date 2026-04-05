import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Parametric Libraries"
      subtitle="Maintain reusable geometry, allowances, materials, and preset logic blocks."
      actionLabel="Add Library Item"
      items={[
        { title: 'Allowance Library', subtitle: 'Standard board allowances by material family', meta: '12 reusable entries' },
        { title: 'Material Library', subtitle: 'Paper, board, vinyl, synthetic options', meta: 'Shared across 6 standards' },
        { title: 'Geometry Snippets', subtitle: 'Common fold and lock structures', meta: 'Used by packaging builders' }
      ]}
    />
  );
}
