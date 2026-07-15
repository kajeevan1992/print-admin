export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { SuperAdminPage } from '@/modules/super-admin/pages/super-admin-page';

export default function Page() {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link
          href="/super-admin/storefront-setup"
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-accent to-accentAlt px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_10px_30px_rgba(82,123,255,0.28)] transition hover:brightness-110"
        >
          Storefront test setup
        </Link>
      </div>
      <SuperAdminPage />
    </>
  );
}
