export const dynamic = 'force-dynamic';

import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Logout"
      subtitle="Sign out actions and session management controls."
      actionLabel="End All Sessions"
      items={[
        { title: 'Current Session', subtitle: 'This browser session', meta: 'Logged in as admin' },
        { title: 'API Sessions', subtitle: '3 active tokens detected', meta: 'Rotate if needed' },
        { title: 'Remembered Devices', subtitle: '2 trusted devices', meta: 'Last trusted 4 days ago' }
      ]}
    />
  );
}
