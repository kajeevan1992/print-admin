'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Save } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type InvoiceSettings = {
  brandName: string;
  legalName: string;
  tradingName: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  vatNumber: string;
  companyNumber: string;
  bankDetails: string;
  paymentTerms: string;
  footerNote: string;
  accentColour: string;
};

const emptySettings: InvoiceSettings = {
  brandName: '',
  legalName: '',
  tradingName: '',
  address: '',
  email: '',
  phone: '',
  website: '',
  vatNumber: '',
  companyNumber: '',
  bankDetails: '',
  paymentTerms: '',
  footerNote: '',
  accentColour: '#18A7D0',
};

const fields: Array<{ key: keyof InvoiceSettings; label: string; placeholder?: string; area?: boolean; hint?: string }> = [
  { key: 'brandName', label: 'Brand name', placeholder: 'HOLO Print' },
  { key: 'legalName', label: 'Legal company name', placeholder: 'TECH AND PRINT LTD' },
  { key: 'tradingName', label: 'Trading name', placeholder: 'HOLO Print' },
  { key: 'address', label: 'Company address', placeholder: '54 Sidcup High Street, Sidcup, DA14 6EH', area: true },
  { key: 'email', label: 'Invoice email', placeholder: 'sales@holoprint.co.uk' },
  { key: 'phone', label: 'Phone', placeholder: '07352 598244' },
  { key: 'website', label: 'Website', placeholder: 'https://holoprint.co.uk' },
  { key: 'vatNumber', label: 'VAT number', placeholder: 'GB...' },
  { key: 'companyNumber', label: 'Company number', placeholder: 'Companies House number' },
  { key: 'bankDetails', label: 'Bank details', placeholder: 'Bank / sort code / account number', area: true, hint: 'Shown in the invoice footer. Leave blank if you do not want bank details on PDFs.' },
  { key: 'paymentTerms', label: 'Payment terms', placeholder: 'Payment due on receipt unless agreed otherwise.', area: true },
  { key: 'footerNote', label: 'Footer note', placeholder: 'Thank you for choosing HOLO Print.', area: true },
  { key: 'accentColour', label: 'Accent colour', placeholder: '#18A7D0' },
];

function pickSettings(payload: any): InvoiceSettings {
  return { ...emptySettings, ...(payload?.data?.settings || payload?.settings || {}) };
}

function VatExplainer() {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-white">VAT breakdown behaviour</h3>
      <div className="mt-4 grid gap-3 text-sm text-textMuted">
        <div className="rounded-xl border border-white/8 bg-panelMuted p-3">
          <p className="font-medium text-white">Mixed VAT basket ready</p>
          <p className="mt-1">Invoices group line items by VAT rate, so zero-rated leaflets/booklets and standard-rated design/signage can appear on the same invoice.</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-panelMuted p-3">
          <p className="font-medium text-white">Line-level VAT</p>
          <p className="mt-1">When product/order items carry VAT metadata, the PDF shows net, VAT rate, VAT amount and gross totals.</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-panelMuted p-3">
          <p className="font-medium text-white">No schema migration</p>
          <p className="mt-1">These settings save through the internal invoice settings API and `.data` fallback from Build 31.</p>
        </div>
      </div>
    </Card>
  );
}

export function InvoiceSettingsPage() {
  const [settings, setSettings] = useState<InvoiceSettings>(emptySettings);
  const [sampleOrderId, setSampleOrderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const previewUrl = useMemo(() => sampleOrderId.trim() ? `/api/internal/orders/${encodeURIComponent(sampleOrderId.trim())}/documents/invoice` : '', [sampleOrderId]);

  async function load() {
    setLoading(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/internal/settings/invoice', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Failed to load invoice settings.');
      setSettings(pickSettings(payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice settings.');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/internal/settings/invoice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Failed to save invoice settings.');
      setSettings(pickSettings(payload));
      setMessage('Invoice settings saved. New invoice and receipt PDFs will use these details.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice settings.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div>
      <PageHeader
        title="Invoice Settings"
        subtitle="Brand, legal, VAT, bank and footer details used by generated invoice and receipt PDFs."
        actions={
          <>
            <Button onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</Button>
            <PrimaryButton onClick={() => void save()} disabled={saving || loading}><Save size={14} /> Save settings</PrimaryButton>
          </>
        }
      />

      {message ? <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
      {loading ? <Card>Loading invoice settings…</Card> : null}

      {!loading ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-white">Business details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className={field.area ? 'md:col-span-2' : ''}>
                  <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-textMuted">{field.label}</span>
                  {field.area ? (
                    <textarea
                      value={settings[field.key] || ''}
                      onChange={(event) => setSettings((current) => ({ ...current, [field.key]: event.target.value }))}
                      placeholder={field.placeholder}
                      className="min-h-[92px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none transition placeholder:text-textMuted/70 focus:border-accent/70 focus:bg-panelMuted"
                    />
                  ) : (
                    <Input
                      value={settings[field.key] || ''}
                      onChange={(event) => setSettings((current) => ({ ...current, [field.key]: event.target.value }))}
                      placeholder={field.placeholder}
                    />
                  )}
                  {field.hint ? <span className="mt-1 block text-xs text-textMuted">{field.hint}</span> : null}
                </label>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-white">Invoice preview</h3>
              <p className="mt-2 text-sm leading-6 text-textMuted">Enter a real order ID or order number to open a branded PDF using the current saved settings.</p>
              <div className="mt-4 space-y-3">
                <Input value={sampleOrderId} onChange={(event) => setSampleOrderId(event.target.value)} placeholder="Order ID or order number" />
                <div className="flex flex-wrap gap-2">
                  <a href={previewUrl || '#'} target="_blank" aria-disabled={!previewUrl} className={!previewUrl ? 'pointer-events-none opacity-50' : ''}>
                    <PrimaryButton type="button" disabled={!previewUrl}><Download size={14} /> Preview invoice</PrimaryButton>
                  </a>
                  <a href={sampleOrderId.trim() ? `/api/internal/orders/${encodeURIComponent(sampleOrderId.trim())}/documents/receipt` : '#'} target="_blank" aria-disabled={!sampleOrderId.trim()} className={!sampleOrderId.trim() ? 'pointer-events-none opacity-50' : ''}>
                    <Button type="button" disabled={!sampleOrderId.trim()}><Download size={14} /> Preview receipt</Button>
                  </a>
                </div>
              </div>
            </Card>
            <VatExplainer />
          </div>
        </div>
      ) : null}
    </div>
  );
}
