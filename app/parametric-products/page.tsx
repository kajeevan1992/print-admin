import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Parametric Products"
      subtitle="Review and maintain standards-driven products generated from parametric rules."
      actionLabel="Add Parametric Product"
      items={[
        { title: 'Mailer Box Standard', subtitle: 'Sizes XS / S / M / L', meta: 'Material groups assigned' },
        { title: 'Folded Carton Standard', subtitle: '3 panel and 5 panel variants', meta: 'Allowance logic configured' },
        { title: 'Bottle Label Standard', subtitle: 'Roll-fed label preset', meta: 'Artwork safe zones enabled' }
      ]}
    />
  );
}
