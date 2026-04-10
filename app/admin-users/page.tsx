export const dynamic = 'force-dynamic';

import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Admin Users"
      subtitle="Manage elevated users with back-office permissions and environment access."
      actionLabel="Invite Admin User"
      items={[
        { title: 'Alex Rivera', subtitle: 'Super admin', meta: 'Last active today' },
        { title: 'Mina Chen', subtitle: 'Operations manager', meta: '2FA enforced' },
        { title: 'Jordan Lee', subtitle: 'Finance admin', meta: 'Billing access enabled' }
      ]}
    />
  );
}
