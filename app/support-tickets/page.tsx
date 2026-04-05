import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Support Tickets"
      subtitle="Review internal support cases, escalations, and resolution notes."
      actionLabel="New Ticket"
      items={[
        { title: 'Ticket #8124', subtitle: 'Checkout customization request', meta: 'Awaiting engineering review' },
        { title: 'Ticket #8118', subtitle: 'Vendor proof mismatch', meta: 'In progress' },
        { title: 'Ticket #8099', subtitle: 'Store clone assistance', meta: 'Resolved yesterday' }
      ]}
    />
  );
}
