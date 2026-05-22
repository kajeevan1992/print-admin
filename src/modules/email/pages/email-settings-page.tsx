'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw, Save, Send } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type TemplateKey = 'artwork-reupload-request' | 'artwork-approved' | 'artwork-rejected' | 'artwork-pending-review';

type Template = {
  key: TemplateKey;
  label: string;
  subject: string;
  body: string;
  enabled: boolean;
};

type Settings = {
  brandName: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  storefrontUrl: string;
  adminUrl: string;
  autoSendArtworkEmails: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpPassSet?: boolean;
  storageMode?: string;
  storageTenantId?: string;
  templates: Record<TemplateKey, Template>;
};

const templateKeys: TemplateKey[] = ['artwork-reupload-request', 'artwork-approved', 'artwork-rejected', 'artwork-pending-review'];
const variables = ['brandName', 'customerName', 'orderNumber', 'productName', 'fileName', 'note', 'reuploadLink', 'storefrontUrl', 'adminUrl'];

const emptySettings: Settings = {
  brandName: 'HOLO PRINT',
  fromName: 'HOLO PRINT',
  fromEmail: '',
  replyTo: '',
  storefrontUrl: '',
  adminUrl: '',
  autoSendArtworkEmails: false,
  smtpHost: '',
  smtpPort: '587',
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  templates: {} as Record<TemplateKey, Template>,
};

export function EmailSettingsPage() {
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [selectedKey, setSelectedKey] = useState<TemplateKey>('artwork-reupload-request');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');

  const selectedTemplate = settings.templates?.[selectedKey];
  const smtpReady = useMemo(() => Boolean(settings.smtpHost && settings.smtpPort && settings.smtpUser && (settings.smtpPass || settings.smtpPassSet)), [settings]);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/internal/email-settings', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (payload?.data) setSettings(payload.data);
      if (payload?.ok === false) setMessage(payload.error || 'Failed to load email settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function updateField(key: keyof Settings, value: string | boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateTemplate(field: keyof Template, value: string | boolean) {
    setSettings((current) => {
      const currentTemplate = current.templates?.[selectedKey];
      if (!currentTemplate) return current;
      return {
        ...current,
        templates: {
          ...current.templates,
          [selectedKey]: { ...currentTemplate, [field]: value },
        },
      };
    });
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const payload = { ...settings, smtpPass: settings.smtpPass === '********' ? '__KEEP_EXISTING__' : settings.smtpPass };
      const res = await fetch('/api/internal/email-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.ok === false) throw new Error(body?.error || 'Failed to save email settings.');
      setSettings(body.data);
      setMessage('Email settings saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save email settings.');
    } finally {
      setSaving(false);
    }
  }

  async function previewTemplate() {
    const res = await fetch('/api/internal/email-settings/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: selectedKey }) });
    const payload = await res.json().catch(() => ({}));
    setPreview(payload?.data ? { subject: payload.data.subject, body: payload.data.body } : null);
  }

  async function sendTest() {
    setMessage('');
    const res = await fetch('/api/internal/email-settings/test-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testEmail }) });
    const payload = await res.json().catch(() => ({}));
    if (payload?.email?.status) {
      setMessage(`Test email status: ${payload.email.status}${payload.email.lastError ? ` — ${payload.email.lastError}` : ''}`);
    } else {
      setMessage(payload?.error || 'Test email queued.');
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Email Settings"
        subtitle="Configure tenant SMTP and editable artwork notification templates. These settings override environment variables."
        actions={
          <div className="flex gap-2">
            <Button onClick={() => void load()}><RefreshCw size={14} /> Refresh</Button>
            <PrimaryButton onClick={() => void save()} disabled={saving}><Save size={14} /> Save</PrimaryButton>
          </div>
        }
      />

      {message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
      {settings.storageMode ? <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-textMuted">Storage: {settings.storageMode}{settings.storageTenantId ? ` · Tenant: ${settings.storageTenantId}` : ''}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-white">Brand + URLs</h3>
            <div className="grid gap-3">
              <Input value={settings.brandName || ''} onChange={(event) => updateField('brandName', event.target.value)} placeholder="Brand name" />
              <Input value={settings.storefrontUrl || ''} onChange={(event) => updateField('storefrontUrl', event.target.value)} placeholder="Storefront URL" />
              <Input value={settings.adminUrl || ''} onChange={(event) => updateField('adminUrl', event.target.value)} placeholder="Admin API URL" />
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 text-sm font-semibold text-white">SMTP</h3>
            <div className={`mb-4 rounded-xl border p-3 text-sm ${smtpReady ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>{smtpReady ? 'SMTP details look complete.' : 'SMTP is incomplete.'}</div>
            <div className="grid gap-3">
              <Input value={settings.fromName || ''} onChange={(event) => updateField('fromName', event.target.value)} placeholder="From name" />
              <Input value={settings.fromEmail || ''} onChange={(event) => updateField('fromEmail', event.target.value)} placeholder="From email" />
              <Input value={settings.replyTo || ''} onChange={(event) => updateField('replyTo', event.target.value)} placeholder="Reply-to email" />
              <Input value={settings.smtpHost || ''} onChange={(event) => updateField('smtpHost', event.target.value)} placeholder="SMTP host" />
              <Input value={settings.smtpPort || ''} onChange={(event) => updateField('smtpPort', event.target.value)} placeholder="SMTP port" />
              <Input value={settings.smtpUser || ''} onChange={(event) => updateField('smtpUser', event.target.value)} placeholder="SMTP user" />
              <Input type="password" value={settings.smtpPass || ''} onChange={(event) => updateField('smtpPass', event.target.value)} placeholder={settings.smtpPassSet ? 'Password saved — type to replace' : 'SMTP password'} />
              <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={Boolean(settings.smtpSecure)} onChange={(event) => updateField('smtpSecure', event.target.checked)} /> Use secure SMTP / SSL</label>
              <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={Boolean(settings.autoSendArtworkEmails)} onChange={(event) => updateField('autoSendArtworkEmails', event.target.checked)} /> Auto-send artwork emails</label>
            </div>
            <div className="mt-4 flex gap-2">
              <Input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="Send test to email" />
              <Button onClick={() => void sendTest()} disabled={!testEmail}><Send size={14} /> Test</Button>
            </div>
          </Card>
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">Artwork Email Templates</h3>
            <Button onClick={() => void previewTemplate()}><Eye size={14} /> Preview</Button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {templateKeys.map((key) => (
              <button key={key} onClick={() => { setSelectedKey(key); setPreview(null); }} className={`rounded-full border px-3 py-1.5 text-xs ${selectedKey === key ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-textMuted'}`}>
                {settings.templates?.[key]?.label || key}
              </button>
            ))}
          </div>

          {selectedTemplate ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={Boolean(selectedTemplate.enabled)} onChange={(event) => updateTemplate('enabled', event.target.checked)} /> Template enabled</label>
              <Input value={selectedTemplate.subject || ''} onChange={(event) => updateTemplate('subject', event.target.value)} placeholder="Subject" />
              <textarea value={selectedTemplate.body || ''} onChange={(event) => updateTemplate('body', event.target.value)} className="min-h-[280px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" />
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-textMuted">
                Variables: {variables.map((variable) => <code key={variable} className="mx-1 rounded bg-black/20 px-1.5 py-0.5">{'{{' + variable + '}}'}</code>)}
              </div>
              {preview ? <div className="rounded-xl border border-white/8 bg-black/20 p-4"><p className="text-sm font-semibold text-white">{preview.subject}</p><pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-textMuted">{preview.body}</pre></div> : null}
            </div>
          ) : (
            <p className="text-sm text-textMuted">{loading ? 'Loading templates…' : 'Template not found.'}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
