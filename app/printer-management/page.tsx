import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Printer Management"
      subtitle="Maintain printer records, capabilities, and assignment policies."
      actionLabel="Add Printer"
      items={[
        { title: 'HP Indigo 7900', subtitle: 'Digital press line', meta: 'Available' },
        { title: 'Heidelberg XL 106', subtitle: 'Offset large-run line', meta: 'Maintenance scheduled' },
        { title: 'Epson SureColor', subtitle: 'Large-format proof output', meta: 'Calibration current' }
      ]}
    />
  );
}
