'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type GlobalVatSettings = {
  enabled: boolean;
  pricesIncludeVat: boolean;
  standardVatRate: number;
  defaultVatClass: 'standard' | 'zero' | 'exempt';
  defaultFallbackVatRate: number;
  deliveryVatClass: 'standard' | 'zero' | 'exempt' | 'custom';
  deliveryVatRate: number;
  designServiceVatRate: number;
  forceDesignServicesStandardVat: boolean;
  zeroRatedProductTerms: string;
  standardRatedProductTerms: string;
  standardRatedServiceTerms: string;
  requireLineVatMetadata: boolean;
  invoiceShowVatBreakdown: boolean;
  adminNote: string;
};

const emptySettings: GlobalVatSettings = {
  enabled: true,
  pricesIncludeVat: true,
  standardVatRate: 20,
  defaultVatClass: 'standard',
  defaultFallbackVatRate: 20,
  deliveryVatClass: 'standard',
  deliveryVatRate: 20,
  designServiceVatRate: 20,
  forceDesignServicesStandardVat: true,
  zeroRatedProductTerms: '',
  standardRatedProductTerms: '',
  standardRatedServiceTerms: '',
  requireLineVatMetadata: true,
  invoiceShowVatBreakdown: true,
  adminNote: '',
};

function pickSettings(payload: any): GlobalVatSettings { return { ...emptySettings, ...(payload?.data?.settings || payload?.settings || {}) }; }
function termCount(value: string) { return String(value || '').split(',').map((item) => item.trim()).filter(Boolean).length; }

export function TaxVatSettingsPage() {
  const [settings, setSettings] = useState<GlobalVatSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const summary = useMemo(() => [
    { label: 'Standard rate', value: `${settings.standardVatRate || 0}%` },
    { label: 'Default fallback', value: `${settings.defaultFallbackVatRate || 0}%` },
    { label: 'Zero-rated terms', value: String(termCount(settings.zeroRatedProductTerms)) },
    { label: 'Standard terms', value: String(termCount(settings.standardRatedProductTerms)) },
  ], [settings]);

  async function load() {
    setLoading(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/internal/settings/vat', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Failed to load VAT settings.');
      setSettings(pickSettings(payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load VAT settings.');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/internal/settings/vat', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Failed to save VAT settings.');
      setSettings(pickSettings(payload));
      setMessage('Global VAT settings saved. Product-level VAT controls still override these defaults.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save VAT settings.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const update = <K extends keyof GlobalVatSettings>(key: K, value: GlobalVatSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  return (
    <div>
      <PageHeader
        title="Tax / VAT Settings"
        subtitle="Global VAT defaults used by checkout, product fallback rules, delivery VAT and invoice VAT breakdowns."
        actions={<><Button onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</Button><PrimaryButton onClick={() => void save()} disabled={loading || saving}><Save size={14} /> Save settings</PrimaryButton></>}
      />

      {message ? <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
      {loading ? <Card>Loading VAT settings…</Card> : null}

      {!loading ? <>
        <div className="mb-4 grid gap-4 md:grid-cols-4">
          {summary.map((item) => <Card key={item.label}><p className="text-xs uppercase tracking-wide text-textMuted">{item.label}</p><p className="mt-2 text-2xl font-semibold text-white">{item.value}</p></Card>)}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-white">Core VAT defaults</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-panelMuted p-3 text-sm text-textMuted"><input type="checkbox" checked={settings.enabled} onChange={(e) => update('enabled', e.target.checked)} /><span><b className="block text-white">Enable VAT engine</b>When disabled, VAT calculations fall back to 0%.</span></label>
                <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-panelMuted p-3 text-sm text-textMuted"><input type="checkbox" checked={settings.pricesIncludeVat} onChange={(e) => update('pricesIncludeVat', e.target.checked)} /><span><b className="block text-white">Prices include VAT</b>Checkout totals are treated as gross prices and split into net/VAT.</span></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-white">Standard VAT rate %</span><Input type="number" value={String(settings.standardVatRate)} onChange={(e) => update('standardVatRate', Number(e.target.value || 0))} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-white">Default product VAT class</span><Select options={[{ value: 'standard', label: 'Standard' }, { value: 'zero', label: 'Zero-rated' }, { value: 'exempt', label: 'Exempt' }]} value={settings.defaultVatClass} onChange={(e) => update('defaultVatClass', e.target.value as GlobalVatSettings['defaultVatClass'])} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-white">Fallback VAT rate %</span><Input type="number" value={String(settings.defaultFallbackVatRate)} onChange={(e) => update('defaultFallbackVatRate', Number(e.target.value || 0))} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-white">Design service VAT rate %</span><Input type="number" value={String(settings.designServiceVatRate)} onChange={(e) => update('designServiceVatRate', Number(e.target.value || 0))} /></label>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-white">Delivery VAT</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm"><span className="font-medium text-white">Delivery VAT class</span><Select options={[{ value: 'standard', label: 'Standard' }, { value: 'zero', label: 'Zero-rated' }, { value: 'exempt', label: 'Exempt' }, { value: 'custom', label: 'Custom rate' }]} value={settings.deliveryVatClass} onChange={(e) => update('deliveryVatClass', e.target.value as GlobalVatSettings['deliveryVatClass'])} /></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-white">Delivery VAT rate %</span><Input type="number" value={String(settings.deliveryVatRate)} onChange={(e) => update('deliveryVatRate', Number(e.target.value || 0))} /></label>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-white">Fallback keyword rules</h3>
              <div className="space-y-4">
                <label className="space-y-2 text-sm"><span className="font-medium text-white">Zero-rated product terms</span><textarea value={settings.zeroRatedProductTerms} onChange={(e) => update('zeroRatedProductTerms', e.target.value)} className="min-h-[88px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" /></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-white">Standard-rated product terms</span><textarea value={settings.standardRatedProductTerms} onChange={(e) => update('standardRatedProductTerms', e.target.value)} className="min-h-[88px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" /></label>
                <label className="space-y-2 text-sm"><span className="font-medium text-white">Standard-rated service/add-on terms</span><textarea value={settings.standardRatedServiceTerms} onChange={(e) => update('standardRatedServiceTerms', e.target.value)} className="min-h-[88px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" /></label>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-white">Rules hierarchy</h3>
              <div className="mt-4 space-y-3 text-sm text-textMuted">
                <div className="rounded-xl border border-white/8 bg-panelMuted p-3"><b className="block text-white">1. Product VAT tab</b>Product-level settings override global defaults.</div>
                <div className="rounded-xl border border-white/8 bg-panelMuted p-3"><b className="block text-white">2. Explicit line metadata</b>Supplier/API/imported line VAT can override fallback keyword rules.</div>
                <div className="rounded-xl border border-white/8 bg-panelMuted p-3"><b className="block text-white">3. Global fallback terms</b>These settings decide unknown products.</div>
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-white">Invoice behaviour</h3>
              <div className="mt-4 space-y-3">
                <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-panelMuted p-3 text-sm text-textMuted"><input type="checkbox" checked={settings.requireLineVatMetadata} onChange={(e) => update('requireLineVatMetadata', e.target.checked)} /><span><b className="block text-white">Require line VAT metadata</b>Order save should store net/VAT/gross per item.</span></label>
                <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-panelMuted p-3 text-sm text-textMuted"><input type="checkbox" checked={settings.invoiceShowVatBreakdown} onChange={(e) => update('invoiceShowVatBreakdown', e.target.checked)} /><span><b className="block text-white">Show VAT breakdown</b>Invoice PDF groups values by VAT rate.</span></label>
                <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-panelMuted p-3 text-sm text-textMuted"><input type="checkbox" checked={settings.forceDesignServicesStandardVat} onChange={(e) => update('forceDesignServicesStandardVat', e.target.checked)} /><span><b className="block text-white">Force design services VAT</b>Design/artwork support remains standard-rated.</span></label>
              </div>
            </Card>

            <Card>
              <div className="mb-2 flex items-center gap-2 text-white"><ShieldCheck size={16} /> Admin note</div>
              <textarea value={settings.adminNote} onChange={(e) => update('adminNote', e.target.value)} className="min-h-[140px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" />
            </Card>
          </div>
        </div>
      </> : null}
    </div>
  );
}
