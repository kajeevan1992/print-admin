export const dynamic = 'force-dynamic';

import { ProductionJobDetailPage } from '@/modules/operations/pages/production-job-detail-page';
import { ArtworkProofAdminPanel } from '@/modules/operations/components/artwork-proof-admin-panel';

export default function Page({ params }: { params: { id: string } }) {
  return <div className="space-y-5"><ProductionJobDetailPage id={params.id} /><ArtworkProofAdminPanel ticketId={params.id} /></div>;
}
