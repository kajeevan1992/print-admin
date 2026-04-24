'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';

type TextField = {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'password' | 'url';
  placeholder?: string;
};

type SelectField = {
  key: string;
  label: string;
  type: 'select';
  options: SelectOption[];
};

type ToggleField = {
  key: string;
  label: string;
  type: 'toggle';
};

type AreaField = {
  key: string;
  label: string;
  type: 'textarea';
  placeholder?: string;
};

type ConfigField = TextField | SelectField | ToggleField | AreaField;

type ConfigSection = {
  title: string;
  description?: string;
  fields: ConfigField[];
};

export function ConfigWorkspacePage({
  storageKey,
  title,
  subtitle,
  sections,
  insights,
  actionsLabel = 'Save Changes'
}: {
  storageKey: string;
  title: string;
  subtitle: string;
  sections: ConfigSection[];
  insights?: string[];
  actionsLabel?: string;
}) {
  const defaultState = useMemo(
    () =>
      sections.reduce<Record<string, string | boolean>>((acc, section) => {
        section.fields.forEach((field) => {
          if (field.type === 'toggle') {
            acc[field.key] = false;
          } else if (field.type === 'select') {
            const first = field.options[0];
            acc[field.key] = typeof first === 'string' ? first : first?.value ?? '';
          } else {
            acc[field.key] = '';
          }
        });
        return acc;
      }, {}),
    [sections]
  );

  const [values, setValues] = useState<Record<string, string | boolean>>(defaultState);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'connected' | 'local' | 'error'>('loading');
  const [message, setMessage] = useState('Loading configuration from internal API...');

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      setStatus('loading');
      setMessage('Loading configuration from internal API...');
      try {
        const response = await fetch(`/api/internal/config/${encodeURIComponent(storageKey)}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal config API failed.');

        const metadata = payload?.data?.metadataJson ?? {};
        if (!cancelled) {
          setValues({ ...defaultState, ...(metadata.values ?? {}) });
          setSavedAt(metadata.savedAt ? new Date(metadata.savedAt).toLocaleString() : null);
          setStatus('connected');
          setMessage(payload?.data ? 'Connected to database. Changes save through the internal API.' : 'Connected to database. No saved configuration yet.');
        }
      } catch (error) {
        const raw = window.localStorage.getItem(storageKey);
        if (!cancelled && raw) {
          try {
            const parsed = JSON.parse(raw) as { values?: Record<string, string | boolean>; savedAt?: string };
            setValues({ ...defaultState, ...(parsed.values ?? {}) });
            setSavedAt(parsed.savedAt ?? null);
            setStatus('local');
            setMessage(`Internal API unavailable, showing browser-saved fallback: ${error instanceof Error ? error.message : 'unknown error'}`);
            return;
          } catch {
            // Continue to normal error state below.
          }
        }
        if (!cancelled) {
          setValues(defaultState);
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Configuration could not be loaded.');
        }
      }
    }

    loadConfig();
    return () => { cancelled = true; };
  }, [defaultState, storageKey]);

  const updateValue = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setStatus('loading');
    setMessage('Saving configuration through internal API...');
    try {
      const response = await fetch(`/api/internal/config/${encodeURIComponent(storageKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: subtitle, values }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal config API save failed.');
      const saved = payload?.data?.metadataJson?.savedAt || new Date().toISOString();
      const displaySavedAt = new Date(saved).toLocaleString();
      window.localStorage.setItem(storageKey, JSON.stringify({ values, savedAt: displaySavedAt }));
      setSavedAt(displaySavedAt);
      setStatus('connected');
      setMessage('Saved to database through internal API.');
    } catch (error) {
      const nextSavedAt = new Date().toLocaleString();
      window.localStorage.setItem(storageKey, JSON.stringify({ values, savedAt: nextSavedAt }));
      setSavedAt(nextSavedAt);
      setStatus('local');
      setMessage(`Database save failed, kept browser fallback copy: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  };

  const handleReset = async () => {
    setValues(defaultState);
    setSavedAt(null);
    window.localStorage.removeItem(storageKey);
    try {
      await fetch(`/api/internal/config/${encodeURIComponent(storageKey)}`, { method: 'DELETE' });
      setStatus('connected');
      setMessage('Configuration reset in database.');
    } catch (error) {
      setStatus('local');
      setMessage(`Browser fallback reset. Database reset failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div className="flex gap-2">
            <Button onClick={handleReset}>Reset</Button>
            <PrimaryButton onClick={handleSave}>{actionsLabel}</PrimaryButton>
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-border bg-panel px-4 py-3 text-sm">
        <span className={status === 'connected' ? 'text-emerald-300' : status === 'error' ? 'text-red-300' : status === 'local' ? 'text-amber-300' : 'text-textMuted'}>
          {status === 'connected' ? 'Database connected' : status === 'error' ? 'Database issue' : status === 'local' ? 'Local fallback' : 'Checking database'}
        </span>
        <span className="ml-2 text-textMuted">{message}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.title}>
              <div className="mb-4">
                <h3 className="text-base font-semibold">{section.title}</h3>
                {section.description ? <p className="mt-1 text-sm text-textMuted">{section.description}</p> : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {section.fields.map((field) => {
                  const value = values[field.key];

                  if (field.type === 'toggle') {
                    return (
                      <div key={field.key} className="flex items-center justify-between rounded-lg border border-border bg-panelMuted px-3 py-2">
                        <span className="text-sm">{field.label}</span>
                        <Toggle checked={Boolean(value)} onChange={(checked) => updateValue(field.key, checked)} />
                      </div>
                    );
                  }

                  if (field.type === 'select') {
                    return (
                      <label key={field.key} className="space-y-2">
                        <span className="text-sm font-medium">{field.label}</span>
                        <Select
                          value={String(value ?? '')}
                          options={field.options}
                          onChange={(event) => updateValue(field.key, event.target.value)}
                        />
                      </label>
                    );
                  }

                  if (field.type === 'textarea') {
                    return (
                      <label key={field.key} className="space-y-2 md:col-span-2">
                        <span className="text-sm font-medium">{field.label}</span>
                        <textarea
                          value={String(value ?? '')}
                          placeholder={field.placeholder}
                          onChange={(event) => updateValue(field.key, event.target.value)}
                          className="min-h-28 w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm outline-none focus:border-accent"
                        />
                      </label>
                    );
                  }

                  return (
                    <label key={field.key} className="space-y-2">
                      <span className="text-sm font-medium">{field.label}</span>
                      <Input
                        type={field.type ?? 'text'}
                        value={String(value ?? '')}
                        placeholder={field.placeholder}
                        onChange={(event) => updateValue(field.key, event.target.value)}
                      />
                    </label>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-base font-semibold">Configuration Status</h3>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Storage key: <span className="font-mono text-text">{storageKey}</span></p>
              <p>DB/API status: <span className="text-text">{status}</span></p>
              <p>Last saved: <span className="text-text">{savedAt ?? 'Not saved yet'}</span></p>
              <p>Sections: <span className="text-text">{sections.length}</span></p>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-base font-semibold">Recommended Checks</h3>
            <ul className="space-y-2 text-sm text-textMuted">
              {(insights ?? [
                'Review defaults before enabling customer-facing changes.',
                'Keep operational contact details up to date.',
                'Save after each configuration batch to preserve local state.'
              ]).map((insight) => (
                <li key={insight} className="rounded-lg border border-border bg-panelMuted px-3 py-2">{insight}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
