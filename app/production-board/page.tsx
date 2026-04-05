import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Production Board"
      subtitle="Track jobs by stage, SLA risk, and plant workload in one operational board."
      actionLabel="Open Board View"
      items={[
        { title: 'Queue: Prepress', subtitle: '14 jobs awaiting approval', meta: '2 SLA risks' },
        { title: 'Queue: Printing', subtitle: '9 jobs active on press', meta: 'Average cycle 2.4h' },
        { title: 'Queue: Dispatch', subtitle: '6 orders packed today', meta: 'Carrier scan sync healthy' }
      ]}
    />
  );
}
