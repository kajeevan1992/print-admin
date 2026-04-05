import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Support"
      subtitle="Central workspace for support operations, queues, and escalation ownership."
      actionLabel="Create Support Task"
      items={[
        { title: 'Priority Queue', subtitle: '8 active items', meta: 'Average first response 22m' },
        { title: 'Escalations', subtitle: '2 awaiting technical review', meta: 'SLA target met' },
        { title: 'Customer Follow-ups', subtitle: '14 reminders due today', meta: 'Shared inbox synced' }
      ]}
    />
  );
}
