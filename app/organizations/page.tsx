import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Organizations"
      subtitle="Assign storefront access, collections, and permissions by organization."
      actionLabel="Add Organization"
      items={[
        { title: 'Northwind Healthcare', subtitle: '3 store assignments', meta: 'B2B portal active' },
        { title: 'Acme Corporate', subtitle: '2 billing contacts', meta: 'Custom catalog enabled' },
        { title: 'Global University', subtitle: 'Education pricing applied', meta: '4 departments linked' }
      ]}
    />
  );
}
