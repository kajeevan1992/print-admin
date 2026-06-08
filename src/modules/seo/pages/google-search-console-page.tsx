'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, KeyRound, Search, ShieldCheck, UploadCloud } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Settings = {
  siteUrl: string;
  authMode: 'env-service-account' | 'env-access-token' | 'not-configured';
  defaultDays: number;
  rowLimit: number;
  country?: string;
  device?: string;
  notes?: string;
  lastImportAt?: string;
  lastImportSummary?: Record<string, any>;
};

type Dashboard = {
  settings: Settings;
  status: { connected: boolean; authMode: string; siteUrl: string; canImport: boolean; lastImportAt?: string | null; lastImportSummary?: Record<string, any> | null };
  setup: { requiredEnv: string[]; alternativeEnv: string[]; serviceAccountSteps: string[] };
};

function todayMinus(days: number) { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); }

export function GoogleSearchConsolePage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [settings, setSettings] = useState<Settings>({ siteUrl: 'https://holoprint.co.uk/', authMode: 'not-configured', defaultDays: 28, rowLimit: 250, country: '', device: '', notes: '' });
  const [importForm, setImportForm] = useState({ startDate: todayMinus(30), endDate: todayMinus(2), rowLimit: '250', country: '', device: '' });
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/internal/seo/search-console', { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Search Console integration failed to load.');
    setDashboard(payload.data);
    setSettings(payload.data?.settings || settings);
    setImportForm((current) => ({ ...current, rowLimit: String(payload.data?.settings?.rowLimit || current.rowLimit), country: payload.data?.settings?.country || '', device: payload.data?.settings?.device || '' }));
    setLoading(false);
  }

  async function save() {
    setBusy(true);
    const res = await fetch('/api/internal/seo/search-console', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', settings }) });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Search Console settings save failed.');
    setDashboard(payload.data?.dashboard || payload.data);
    setMessage('Search Console settings saved. Credentials still come from Coolify environment variables.');
  }

  async function run(action: 'dry-run' | 'import') {
    setBusy(true);
    setPreview(null);
    const res = await fetch('/api/internal/seo/search-console', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, import: { ...importForm, rowLimit: Number(importForm.rowLimit || 250) } }) });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || `Search Console ${action} failed.`);
    setPreview(payload.data);
    setMessage(action === 'import' ? `Imported ${payload.data?.count || 0} Search Console page metric rows into SEO Analytics.` : `Dry run found ${payload.data?.count || 0} page metric rows.`);
    if (action === 'import') await load();
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);

  const status = dashboard?.status;
  const connected = Boolean(status?.connected);

  return (
    <div>
      <PageHeader title="Google Search Console" subtitle="Import Search Console clicks, impressions, CTR, average position and top queries into the existing SEO Analytics dashboard." actions={<><Button onClick={() => void load()}>Refresh</Button><PrimaryButton onClick={() => void save()} disabled={busy}>Save settings</PrimaryButton></>} />
      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <Metric label="Connection" value={connected ? 'Connected' : 'Not configured'} tone={connected ? 'green' : 'amber'} />
        <Metric label="Auth mode" value={status?.authMode || settings.authMode} />
        <Metric label="Site property" value={status?.siteUrl || settings.siteUrl} small />
        <Metric label="Last import" value={status?.lastImportAt ? new Date(status.lastImportAt).toLocaleString() : 'Never'} small />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2"><KeyRound size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Connection settings</h3></div>
            <div className="grid gap-3">
              <label className="grid gap-1 text-xs text-textMuted">Search Console property URL<Input value={settings.siteUrl || ''} onChange={(e) => setSettings((c) => ({ ...c, siteUrl: e.target.value }))} placeholder="https://holoprint.co.uk/ or sc-domain:holoprint.co.uk" /></label>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-xs text-textMuted">Default days<Input value={String(settings.defaultDays || 28)} onChange={(e) => setSettings((c) => ({ ...c, defaultDays: Number(e.target.value || 28) }))} /></label>
                <label className="grid gap-1 text-xs text-textMuted">Row limit<Input value={String(settings.rowLimit || 250)} onChange={(e) => setSettings((c) => ({ ...c, rowLimit: Number(e.target.value || 250) }))} /></label>
                <Select value={settings.device || ''} onChange={(e) => setSettings((c) => ({ ...c, device: e.target.value }))} options={[{ value: '', label: 'All devices' }, { value: 'desktop', label: 'Desktop' }, { value: 'mobile', label: 'Mobile' }, { value: 'tablet', label: 'Tablet' }]} />
              </div>
              <label className="grid gap-1 text-xs text-textMuted">Country filter, optional<Input value={settings.country || ''} onChange={(e) => setSettings((c) => ({ ...c, country: e.target.value }))} placeholder="GB" /></label>
              <label className="grid gap-1 text-xs text-textMuted">Notes<textarea className="min-h-[90px] rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-6 text-white outline-none" value={settings.notes || ''} onChange={(e) => setSettings((c) => ({ ...c, notes: e.target.value }))} /></label>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-300" /><h3 className="text-sm font-semibold text-white">Coolify env vars</h3></div>
            <div className="space-y-3 text-sm leading-6 text-textMuted">
              <p>Preferred service-account setup:</p>
              <Code>GOOGLE_SEARCH_CONSOLE_SITE_URL={settings.siteUrl || 'https://holoprint.co.uk/'}</Code>
              <Code>GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com</Code>
              <Code>GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"</Code>
              <p>Temporary alternative for testing:</p>
              <Code>GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN=ya29...</Code>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-100">Do not save private keys in the database. Keep them only in Coolify environment variables.</div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2"><UploadCloud size={16} className="text-purple-300" /><h3 className="text-sm font-semibold text-white">Import Search Console data</h3></div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-xs text-textMuted">Start date<Input value={importForm.startDate} onChange={(e) => setImportForm((c) => ({ ...c, startDate: e.target.value }))} /></label>
              <label className="grid gap-1 text-xs text-textMuted">End date<Input value={importForm.endDate} onChange={(e) => setImportForm((c) => ({ ...c, endDate: e.target.value }))} /></label>
              <label className="grid gap-1 text-xs text-textMuted">Row limit<Input value={importForm.rowLimit} onChange={(e) => setImportForm((c) => ({ ...c, rowLimit: e.target.value }))} /></label>
              <Select value={importForm.device} onChange={(e) => setImportForm((c) => ({ ...c, device: e.target.value }))} options={[{ value: '', label: 'All devices' }, { value: 'desktop', label: 'Desktop' }, { value: 'mobile', label: 'Mobile' }, { value: 'tablet', label: 'Tablet' }]} />
              <label className="grid gap-1 text-xs text-textMuted md:col-span-2">Country filter, optional<Input value={importForm.country} onChange={(e) => setImportForm((c) => ({ ...c, country: e.target.value }))} placeholder="GB" /></label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => void run('dry-run')} disabled={busy || !connected}><Search size={14} /> Dry run</Button><PrimaryButton onClick={() => void run('import')} disabled={busy || !connected}>Import into SEO Analytics</PrimaryButton></div>
            {!connected ? <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">Set env credentials and redeploy before running imports.</div> : null}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-300" /><h3 className="text-sm font-semibold text-white">Setup checklist</h3></div>
            <ol className="grid gap-2 text-sm leading-6 text-textMuted">
              {(dashboard?.setup?.serviceAccountSteps || []).map((step, index) => <li key={step} className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><strong className="text-white">{index + 1}.</strong> {step}</li>)}
            </ol>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-white">Import preview/result</h3><a href="/seo-analytics" className="flex items-center gap-1 text-xs text-sky-200">Open SEO Analytics <ExternalLink size={13} /></a></div>
            <pre className="max-h-[360px] overflow-auto rounded-xl border border-white/8 bg-black/30 p-4 text-xs leading-6 text-white">{loading ? 'Loading...' : preview ? JSON.stringify(preview, null, 2) : 'Run a dry-run to preview Search Console rows before importing.'}</pre>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default', small = false }: { label: string; value: string; tone?: 'default' | 'green' | 'amber'; small?: boolean }) {
  const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : '';
  return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className={`${small ? 'text-sm break-words' : 'text-2xl'} mt-2 font-semibold text-white`}>{value}</p></Card>;
}

function Code({ children }: { children: string }) {
  return <pre className="overflow-auto rounded-xl border border-white/8 bg-black/30 p-3 text-xs text-white">{children}</pre>;
}
