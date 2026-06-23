export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { AcceptInvitePage } from '@/modules/platform/accept-invite-page';

export default function Page() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-textMuted">Loading invite…</div>}><AcceptInvitePage /></Suspense>;
}
