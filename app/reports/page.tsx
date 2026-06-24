'use client';

export const dynamic = 'force-dynamic';

import { useAuth } from '@/lib/auth';
import { ReportsPage } from '@/modules/reports/pages/reports-page';
import { LiveOwnerReportsPage } from '@/modules/super-admin/pages/live-owner-reports-page';

export default function Page() {
  const { session } = useAuth();
  if (session?.role === 'super_admin') return <LiveOwnerReportsPage />;
  return <ReportsPage />;
}
