export const dynamic = 'force-dynamic';

import { ProductionJobDetailPage } from '@/modules/operations/pages/production-job-detail-page';

export default function Page({ params }: { params: { id: string } }) {
  return <ProductionJobDetailPage id={params.id} />;
}
