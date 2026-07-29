'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Store,
  TriangleAlert,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type StoreRecord = {
  storeId: string;
  slug: string;
  name: string;
  status: string;
  theme: string;
};

type RepairState = {
  target: {
    tenantSlug: string;
    storeId: string;
    storeSlug: string;
    storeName: string;
    liveTheme: string;
  };
  tenant: { id: string; slug: string; name: string; status: string } | null;
  store: StoreRecord | null;
  storefrontUrl: string;
  canRepair: boolean;
  reason: string;
  changed?: boolean;
  action?: 'created-and-published' | 'published-existing' | 'already-ready';
};

async function readJson(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.ok === false) {
    throw new Error(json?.error?.message || 'HOLO storefront repair request failed.');
  }
  return json.data as RepairState;
}

export function HoloStorefrontRepairPage() {
  const [state, setState] = useState<RepairState | null>(null);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadStatus() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/internal/platform/holo-storefront-repair', { cache: 'no-store' });
      setState(await readJson(response));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to check the HOLO storefront.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function repair() {
    const confirmed = window.confirm(
      'Create only the missing HOLO default-store and publish it with Atlantis? Products, pricing, API credentials and HOLO V2 will not be changed.',
    );
    if (!confirmed) return;

    setRepairing(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/internal/platform/holo-storefront-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'REPAIR HOLO STOREFRONT' }),
      });
      const data = await readJson(response);
      setState(data);
      setNotice(
        data.action === 'created-and-published'
          ? 'The missing HOLO default-store was created and published with Atlantis.'
          : data.action === 'published-existing'
            ? 'The existing default-store was published without changing its theme or content.'
            : 'The HOLO default-store was already ready; no change was made.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'HOLO storefront repair failed.');
    } finally {
      setRepairing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="HOLO storefront repair"
        subtitle="Restore only the missing HOLO default-store. This does not provision products, pricing rows or Storefront API credentials."
        actions={(
          <Button onClick={() => window.location.assign('/super-admin')}>Back to Super Admin</Button>
        )}
      />

      {error ? (
        <div className="mb-4 flex gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {notice ? (
        <div className="mb-4 flex gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <Store size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Fixed repair target</h2>
                <p className="mt-1 text-sm text-textMuted">
                  The values below are locked in code so the repair cannot accidentally create a different tenant or store.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Info label="Tenant" value={state?.target.tenantSlug || 'holo-print-sidcup'} />
              <Info label="Store ID" value={state?.target.storeId || 'default-store'} />
              <Info label="Store slug" value={state?.target.storeSlug || 'default-store'} />
              <Info label="Initial live theme" value={state?.target.liveTheme || 'base-atlantis'} />
            </div>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Current status</p>
            {loading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-textMuted">
                <RefreshCw size={16} className="animate-spin" /> Checking the deployed database…
              </div>
            ) : state ? (
              <div className="mt-4 space-y-4">
                <div className={`rounded-2xl border p-4 text-sm ${state.store?.status === 'published' ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/25 bg-amber-400/10 text-amber-100'}`}>
                  {state.reason}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Tenant found" value={state.tenant ? `${state.tenant.name} (${state.tenant.slug})` : 'No'} />
                  <Info label="Store" value={state.store ? `${state.store.name} · ${state.store.status}` : 'Missing'} />
                  <Info label="Current theme" value={state.store?.theme || 'Not created'} />
                  <Info label="Products / pricing" value="Not touched by this repair" />
                </div>

                <div className="flex flex-wrap gap-3">
                  <PrimaryButton onClick={repair} disabled={!state.canRepair || repairing || !state.tenant}>
                    <ShieldCheck size={16} className="mr-2" />
                    {repairing ? 'Repairing…' : state.store ? 'Publish existing default-store' : 'Create safe default-store'}
                  </PrimaryButton>
                  <Button onClick={loadStatus} disabled={loading || repairing}>
                    <RefreshCw size={16} className="mr-2" /> Refresh status
                  </Button>
                  {state.store?.status === 'published' ? (
                    <Link
                      href={state.storefrontUrl}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.018] px-3.5 py-2 text-[12px] font-medium text-text no-underline transition hover:border-white/15 hover:bg-panelMuted"
                    >
                      <ExternalLink size={16} /> Open storefront
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Safety boundary</h2>
                <p className="mt-1 text-sm text-textMuted">This repair is intentionally narrower than Storefront test setup.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-textMuted">
              <SafetyLine text="Requires an authenticated Super Admin session." />
              <SafetyLine text="Refuses to create or rename the HOLO tenant." />
              <SafetyLine text="Creates only the default-store when it is missing." />
              <SafetyLine text="Uses Atlantis for a newly created live storefront." />
              <SafetyLine text="Does not edit products, prices, VAT, orders or customers." />
              <SafetyLine text="Does not create or rotate Storefront API credentials." />
              <SafetyLine text="Does not select or publish HOLO V2." />
            </div>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">After repair</p>
            <p className="mt-3 text-sm leading-6 text-textMuted">
              Sign out of the tenant admin, sign back in as HOLO Print, open Storefront Builder, select HOLO V2, save it as a draft and use Preview saved draft. Atlantis remains live until you publish HOLO V2 yourself.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function SafetyLine({ text }: { text: string }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
      <span>{text}</span>
    </div>
  );
}
