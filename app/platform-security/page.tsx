import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function PlatformSecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Platform Security</h1>
        <p className="mt-2 text-sm text-slate-500">
          Unified security links for super admin platform controls.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link className="rounded-3xl border p-5" href="/database-manager">
          <p className="font-semibold">Database Manager</p>
          <p className="mt-2 text-sm text-slate-500">Manage tenant/site database connections.</p>
        </Link>
        <Link className="rounded-3xl border p-5" href="/owner-api-keys">
          <p className="font-semibold">Owner API Keys</p>
          <p className="mt-2 text-sm text-slate-500">Use the existing owner API key area for public API credentials.</p>
        </Link>
        <Link className="rounded-3xl border p-5" href="/owner-feature-flags">
          <p className="font-semibold">Owner Feature Flags</p>
          <p className="mt-2 text-sm text-slate-500">Use the existing owner feature flag area for rollout control.</p>
        </Link>
      </div>
    </div>
  );
}
