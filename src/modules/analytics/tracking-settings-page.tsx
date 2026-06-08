'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Bug, CheckCircle2, Eye, Settings2, Tag, ToggleLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type TrackingSettings = {
  enabled: boolean;
  ga4Enabled: boolean;
  ga4MeasurementId: string;
  gtmEnabled: boolean;
  gtmContainerId: string;
  googleAdsId: string;
  consentMode: 'off' | 'basic' | 'advanced';
  anonymizeIp: boolean;
  debugMode: boolean;
  trackPageViews: boolean;
  trackSeoEvents: boolean;
  trackViewItem: boolean;
  trackBeginCheckout: boolean;
  trackGenerateLead: boolean;
  trackPurchase: boolean;
  trackCheckoutErrors: boolean;
  currency: string;
  notes?: string;
};

type TrackingDashboard = {
  settings: TrackingSettings;
  publicSettings: TrackingSettings;
  status: { enabled: boolean; ga4Ready: boolean; gtmReady: boolean; hasAnyProvider: boolean; warning: string };
  events: Array<{ key: keyof TrackingSettings; label: string; event: string }>;
};

const defaultSettings: TrackingSettings = {
  enabled: false,
  ga4Enabled: false,
  ga4MeasurementId: '',
  gtmEnabled: false,
  gtmContainerId: '',
  googleAdsId: '',
  consentMode: 'off',
  anonymizeIp: true,
  debugMode: false,
  trackPageViews: true,
  trackSeoEvents: true,
  trackViewItem: true,
  trackBeginCheckout: true,
  trackGenerateLead: true,
  trackPurchase: true,
  trackCheckoutErrors: true,
  currency: 'GBP',
  notes: '',
};

function yes(value: boolean) { return value ? 'Yes' : 'No'; }

export function TrackingSettingsPage() {
  const [dashboard, setDashboard] = useState<TrackingDashboard | null>(null);
  const [settings, setSettings] = useState<TrackingSettings>(defaultSettings);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/internal/analytics/tracking-settings', { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Tracking settings failed to load.');
    setDashboard(payload.data);
    setSettings(payload.data?.settings || defaultSettings);
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/internal/analytics/tracking-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }) });
    const payload = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Tracking settings failed to save.');
    setDashboard(payload.data?.dashboard || payload.data);
    setSettings(payload.data?.settings || payload.data?.dashboard?.settings || settings);
    setMessage('Tracking settings saved. Hosted theme will read them from the storefront analytics settings API.');
  }

  function update<K extends keyof TrackingSettings>(key: K, value: TrackingSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);

  const status = dashboard?.status;
  const events = dashboard?.events || [];

  return (
    <div>
      <PageHeader
        title="Tracking Settings"
        subtitle="Tenant-level GA4, Google Tag Manager and storefront event settings for hosted themes."
        actions={<><Button onClick={() => void load()}>Refresh</Button><PrimaryButton disabled={saving} onClick={() => void save()}>{saving ? 'Saving...' : 'Save settings'}</PrimaryButton></>}
      />
      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 md:grid-cols-5">
        <Metric label="Tracking" value={settings.enabled ? 'Enabled' : 'Disabled'} tone={settings.enabled ? 'green' : 'amber'} />
        <Metric label="GA4 ready" value={yes(Boolean(status?.ga4Ready))} tone={status?.ga4Ready ? 'green' : 'amber'} />
        <Metric label="GTM ready" value={yes(Boolean(status?.gtmReady))} tone={status?.gtmReady ? 'green' : 'amber'} />
        <Metric label="Consent mode" value={settings.consentMode} />
        <Metric label="Currency" value={settings.currency || 'GBP'} />
      </div>

      {status?.warning ? <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">{status.warning}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2"><Settings2 size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Provider settings</h3></div>
            <div className="grid gap-3">
              <Toggle label="Enable tracking" value={settings.enabled} onChange={(value) => update('enabled', value)} />
              <div className="grid gap-3 md:grid-cols-2">
                <Toggle label="Enable GA4" value={settings.ga4Enabled} onChange={(value) => update('ga4Enabled', value)} />
                <label className="grid gap-1 text-xs text-textMuted">GA4 Measurement ID<Input value={settings.ga4MeasurementId || ''} onChange={(e) => update('ga4MeasurementId', e.target.value)} placeholder="G-XXXXXXXXXX" /></label>
                <Toggle label="Enable Google Tag Manager" value={settings.gtmEnabled} onChange={(value) => update('gtmEnabled', value)} />
                <label className="grid gap-1 text-xs text-textMuted">GTM Container ID<Input value={settings.gtmContainerId || ''} onChange={(e) => update('gtmContainerId', e.target.value)} placeholder="GTM-XXXXXXX" /></label>
                <label className="grid gap-1 text-xs text-textMuted">Google Ads ID, optional<Input value={settings.googleAdsId || ''} onChange={(e) => update('googleAdsId', e.target.value)} placeholder="AW-XXXXXXXXX" /></label>
                <label className="grid gap-1 text-xs text-textMuted">Currency<Input value={settings.currency || 'GBP'} onChange={(e) => update('currency', e.target.value.toUpperCase())} placeholder="GBP" /></label>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><ToggleLeft size={16} className="text-purple-300" /><h3 className="text-sm font-semibold text-white">Privacy and consent</h3></div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-xs text-textMuted">Consent mode<Select value={settings.consentMode || 'off'} onChange={(e) => update('consentMode', e.target.value as TrackingSettings['consentMode'])} options={[{ value: 'off', label: 'Off / load immediately' }, { value: 'basic', label: 'Basic consent defaults' }, { value: 'advanced', label: 'Advanced consent defaults' }]} /></label>
              <Toggle label="Anonymize IP / privacy-safe config" value={settings.anonymizeIp} onChange={(value) => update('anonymizeIp', value)} />
              <Toggle label="Debug mode" value={settings.debugMode} onChange={(value) => update('debugMode', value)} />
            </div>
            <p className="mt-3 text-xs leading-6 text-textMuted">Cookie banner integration can be added later; this build creates the tenant tracking switchboard and theme runtime config.</p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-300" /><h3 className="text-sm font-semibold text-white">Storefront events</h3></div>
            <div className="grid gap-2">
              {events.map((item) => <EventToggle key={String(item.key)} label={item.label} event={item.event} value={Boolean(settings[item.key])} onChange={(value) => update(item.key, value as any)} />)}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><Eye size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Storefront public config preview</h3></div>
            <pre className="max-h-[320px] overflow-auto rounded-xl border border-white/8 bg-black/30 p-4 text-xs leading-6 text-white">{loading ? 'Loading...' : JSON.stringify(dashboard?.publicSettings || {}, null, 2)}</pre>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><Tag size={16} className="text-amber-300" /><h3 className="text-sm font-semibold text-white">Test URLs</h3></div>
            <div className="grid gap-2 text-sm text-textMuted">
              <Code>/api/internal/analytics/tracking-settings</Code>
              <Code>/api/internal/storefront/analytics-settings</Code>
              <p>After saving, rebuild/reload hosted theme and check GA4 Realtime/DebugView or GTM Preview.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'green' | 'amber' }) {
  const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : '';
  return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 break-words text-xl font-semibold text-white">{value}</p></Card>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white"><span>{label}</span><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /></label>;
}

function EventToggle({ label, event, value, onChange }: { label: string; event: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm"><span><strong className="text-white">{label}</strong><span className="ml-2 text-xs text-textMuted">{event}</span></span><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /></label>;
}

function Code({ children }: { children: string }) {
  return <pre className="overflow-auto rounded-xl border border-white/8 bg-black/30 p-3 text-xs text-white">{children}</pre>;
}
