import { ModulePlaceholderPage } from '@/components/placeholders/module-placeholder-page';

export default function Page() {
  return <ModulePlaceholderPage title="Quotations" subtitle="Manage quote lifecycle, approvals, and conversion." capabilities={[
    'Configurable quote templates per channel',
    'Approval workflows and SLA timers',
    'Revision history and notes',
    'Quote-to-order conversion analytics'
  ]} />;
}
