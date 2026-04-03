import { ModulePlaceholderPage } from '@/components/placeholders/module-placeholder-page';

export default function Page() {
  return <ModulePlaceholderPage title="Production" subtitle="Coordinate print production queues and plant operations." capabilities={[
    'Work order queue management',
    'Machine and line capacity planning',
    'SLA risk alerts',
    'Plant-level throughput dashboard'
  ]} />;
}
