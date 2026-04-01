import { ProductDetailPage } from '@/modules/products/product-detail-page';

export default function Page({ params }: { params: { id: string } }) {
  return <ProductDetailPage productId={params.id} />;
}
