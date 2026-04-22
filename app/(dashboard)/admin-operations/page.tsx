import { AdminOrderControlBoard } from '@/components/admin/admin-order-control-board';
import { AdminOrderDetailPanel } from '@/components/admin/admin-order-detail-panel';
import { AdminArtworkQueueBoard } from '@/components/admin/admin-artwork-queue-board';

export default function AdminOperationsPage() {
  return (
    <div className="space-y-6">
      <AdminOrderControlBoard />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminOrderDetailPanel orderId="ORD-1001" />
        <AdminArtworkQueueBoard />
      </div>
    </div>
  );
}
