import { ModulePlaceholderPage } from '@/components/placeholders/module-placeholder-page';

export default function Page() {
  return <ModulePlaceholderPage title="Customers" subtitle="Centralized customer records, segments, and activity." capabilities={[
    'B2B account hierarchies',
    'Customer lifetime metrics',
    'Saved configurations and reorders',
    'Support conversation timeline'
  ]} />;
}
