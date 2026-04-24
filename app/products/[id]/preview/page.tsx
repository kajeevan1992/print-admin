export const dynamic = 'force-dynamic';

import { ProductCustomerPreviewPage } from '@/modules/products/pages/product-customer-preview-page';

export default function Page({ params }: { params: { id: string } }) {
  return <ProductCustomerPreviewPage productId={params.id} />;
}
