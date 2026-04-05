import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="Knowledge Base"
      subtitle="Document internal procedures, storefront guidance, and troubleshooting notes."
      actionLabel="Add Article"
      items={[
        { title: 'How to launch a new storefront', subtitle: 'Deployment and checklist guide', meta: 'Updated this week' },
        { title: 'Pricing override troubleshooting', subtitle: 'Common admin support runbook', meta: 'Reviewed by finance' },
        { title: 'Proof approval workflow', subtitle: 'Customer and vendor escalation guide', meta: 'Most viewed article' }
      ]}
    />
  );
}
