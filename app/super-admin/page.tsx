export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { SuperAdminPage } from '@/modules/super-admin/pages/super-admin-page';

const linkClass = 'inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-[12px] font-semibold text-white transition hover:brightness-110';

export default function Page() {
  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link
          href="/super-admin/storefront-repair"
          className={`${linkClass} border border-emerald-400/25 bg-emerald-500/15 text-emerald-100`}
        >
          HOLO storefront repair
        </Link>
        <Link
          href="/super-admin/storefront-setup"
          className={`${linkClass} bg-gradient-to-r from-accent to-accentAlt shadow-[0_10px_30px_rgba(82,123,255,0.28)]`}
        >
          Storefront test setup
        </Link>
      </div>
      <SuperAdminPage />
    </>
  );
}
