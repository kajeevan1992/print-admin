import { ModulePlaceholderPage } from '@/components/placeholders/module-placeholder-page';

export default function Page() {
  return <ModulePlaceholderPage title="Orders" subtitle="Track print orders from checkout to fulfillment." capabilities={[
    'Live production status by stage',
    'Vendor routing and assignment',
    'Shipment tracking timeline',
    'Order exception handling'
  ]} />;
}
