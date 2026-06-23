import { Suspense } from 'react';
import { CustomerAccountPage } from '@/modules/customer/customer-account-page';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <Suspense fallback={<div>Loading...</div>}><CustomerAccountPage /></Suspense>;
}
