import { OrderDetailPage } from '@/modules/orders/pages/order-detail-page';

export default function Page({ params }: { params: { id: string } }) {
  return <OrderDetailPage id={params.id} />;
}
