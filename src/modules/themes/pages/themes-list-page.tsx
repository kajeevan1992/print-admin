'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Paintbrush, RotateCcw, Save, Send, Store } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import { themesService } from '@/services/themes.service';
import type {
  StorefrontThemeAdminState,
  Theme,
  ThemeEditorField,
} from '@/modules/themes/types';

function fieldValue(value: unknown) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

function sectionsValue(value: unknown) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(Array.isArray(value) ? value : [], null, 2);
  } catch {
    return '[]';
  }
}

function FieldControl({ field, value, onChange }: { field: ThemeEditorField; value: unknown; onChange: (value: unknown) => void }) {
  if (field.type === 'boolean') {
    return (
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-accent" />
        <span>{Boolean(value) ? 'Enabled' : 'Disabled'}</span>
      </label>
    );
  }

  if (field.type === 'select') {
    return <Select value={fieldValue(value)} options={(field.options || []).map((option) => ({ label: option.label, value: option.value }))} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.type === 'textarea' || field.type === 'sections') {
    return (
      <textarea
        value={field.type === 'sections' ? sectionsValue(value) : fieldValue(value)}
        onChange={(event) => onChange(event.target.value)}
        rows={field.type === 'sections' ? 12 : 5}
        spellCheck={field.type !== 'sections'}
        className="w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] leading-6 text-text outline-none transition placeholder:text-textMuted/70 focus:border-accent/70 focus:bg-panelMuted"
      />
    );
  }

  if (field.type === 'colour') {
    const colour = /^#[0-9a-fA-F]{6}$/.test(fieldValue(value)) ? fieldValue(value) : '#18A7D0';
    return (
      <div className="grid grid-cols-[54px_1fr] gap-2">
        <input type="color" value={colour} onChange={(event) => onChange(event.target.value)} className="h-11 w-full cursor-pointer rounded-xl border border-white/8 bg-panelMuted p-1" />
        <Input value={fieldValue(value)} onChange={(event) => onChange(event.target.value)} placeholder="#18A7D0" />
      </div>
    );
  }

  return (
    <Input
      type={field.type === 'number' ? 'number' : field.type === 'image' ? 'url' : 'text'}
      value={fieldValue(value)}
      onChange={(event) => onChange(field.type === 'number' ? event.target.valueAsNumber : event.target.value)}
      placeholder={field.type === 'image' ? 'https://… or /images/…' : ''}
    />
  );
}

function EditorGroup({ title, fields, values, onChange }: { title: string; fields: ThemeEditorField[]; values: Record<string, unknown>; onChange: (path: string, value: unknown) => void }) {
  if (!fields.length) return null;
  const grouped = fields.reduce<Record<string, ThemeEditorField[]>>((output, field) => {
    const group = field.group || title;
    output[group] = [...(output[group] || []), field];
    return output;
  }, {});

  return (
    <div className="rounded-2xl border border-white/8 bg-panel p-5 shadow-card">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-textMuted">Fields are supplied by the selected theme manifest.</p>
      </div>
      <div className="space-y-6">
        {Object.entries(grouped).map(([group, groupFields]) => (
          <section key={group}>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{group}</div>
            <div className="grid gap-4 lg:grid-cols-2">
              {groupFields.map((field) => (
                <div key={field.path} className={field.type === 'sections' || field.type === 'textarea' ? 'lg:col-span-2' : ''}>
                  <label className="mb-2 block text-[12px] font-medium text-text">{field.label}</label>
                  {field.description ? <p className="mb-2 text-[11px] leading-5 text-textMuted">{field.description}</p> : null}
                  <FieldControl field={field} value={values[field.path]} onChange={(value) => onChange(field.path, value)} />
                  <div className="mt-1.5 font-mono text-[10px] text-textMuted/70">{field.path}</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ThemeOption({ theme, live, draft, selected, onSelect }: { theme: Theme; live: boolean; draft: boolean; selected: boolean; onSelect: () => void }) {
  const fieldCount = theme.editor.content.length + theme.editor.settings.length;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-2xl border p-4 text-left transition ${selected ? 'border-accent bg-accent/10 shadow-[0_14px_40px_rgba(82,123,255,0.16)]' : 'border-white/8 bg-panel hover:border-white/15 hover:bg-panelMuted/70'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-accent/25 to-accentAlt/20 text-sm font-bold text-white">{theme.previewImage}</div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {live ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">Live</span> : null}
          {draft ? <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-200">Draft</span> : null}
          {selected ? <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-white"><Check className="h-3.5 w-3.5" /></span> : null}
        </div>
      </div>
      <h3 className="mt-4 font-semibold text-white">{theme.name}</h3>
      <p className="mt-1 text-[11px] text-textMuted">v{theme.version} · {theme.source === 'built-in' ? 'Built in' : 'Uploaded'}</p>
      <p className="mt-3 min-h-[42px] text-[12px] leading-5 text-textMuted">{theme.description}</p>
      <div className="mt-4 flex items-center justify-between text-[11px]">
        <span className="text-textMuted">{fieldCount} editable fields</span>
        <span className="font-medium text-accent">Select theme</span>
      </div>
    </button>
  );
}

export function ThemesListPage() {
  const [admin, setAdmin] = useState<StorefrontThemeAdminState | null>(null);
  const [themeKey, setThemeKey] = useState('');
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<'save' | 'publish' | 'discard' | null>(null);
  const [localDirty, setLocalDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const applyState = (state: StorefrontThemeAdminState) => {
    setAdmin(state);
    setThemeKey(state.revision?.draftThemeKey || state.revision?.liveThemeKey || state.themes[0]?.key || '');
    setValues(state.revision?.values || {});
    setLocalDirty(false);
  };

  const load = (storeSlug?: string) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    themesService.getAdminState(storeSlug)
      .then((response) => applyState(response.data))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Failed to load storefront themes.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const selectedTheme = useMemo(() => admin?.themes.find((theme) => theme.key === themeKey || theme.aliases.includes(themeKey)) || null, [admin, themeKey]);
  const selectedStore = admin?.selectedStore || null;
  const revision = admin?.revision || null;
  const hasChanges = localDirty || Boolean(revision?.hasDraftChanges) || Boolean(revision && themeKey !== revision.liveThemeKey);

  const changeValue = (path: string, value: unknown) => {
    setValues((current) => ({ ...current, [path]: value }));
    setLocalDirty(true);
    setNotice(null);
  };

  const chooseTheme = (nextTheme: Theme) => {
    setThemeKey(nextTheme.key);
    setLocalDirty(true);
    setNotice(null);
  };

  const mutate = async (mode: 'save' | 'publish' | 'discard') => {
    if (!selectedStore) return;
    setWorking(mode);
    setError(null);
    setNotice(null);
    try {
      const response = mode === 'save'
        ? await themesService.saveDraft(selectedStore.slug, themeKey, values)
        : mode === 'publish'
          ? await themesService.publish(selectedStore.slug, themeKey, values)
          : await themesService.discardDraft(selectedStore.slug);
      applyState(response.data);
      setNotice(mode === 'save' ? 'Draft saved.' : mode === 'publish' ? 'Theme published to the live storefront.' : 'Draft changes discarded.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Theme update failed.');
    } finally {
      setWorking(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Storefront Themes"
        subtitle="Choose a registered theme, edit tenant-safe settings, save a draft and publish it to one storefront. Pricing, VAT, products and checkout remain controlled by the SaaS."
        actions={selectedStore ? <>
          <Link href={selectedStore.previewUrl} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.018] px-3.5 py-2 text-[12px] font-medium text-text no-underline transition hover:border-white/15 hover:bg-panelMuted"><ExternalLink className="h-4 w-4" />Open storefront</Link>
          <Button disabled={!hasChanges || Boolean(working)} onClick={() => mutate('save')}><Save className="mr-2 h-4 w-4" />{working === 'save' ? 'Saving…' : 'Save draft'}</Button>
          <PrimaryButton disabled={!selectedTheme || Boolean(working)} onClick={() => mutate('publish')}><Send className="mr-2 h-4 w-4" />{working === 'publish' ? 'Publishing…' : 'Publish'}</PrimaryButton>
        </> : undefined}
      />

      {loading ? <div className="rounded-2xl border border-white/8 bg-panel p-6 text-sm text-textMuted">Loading storefront theme settings…</div> : null}
      {error ? <div className="mb-5 rounded-2xl border border-red-500/35 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
      {notice ? <div className="mb-5 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div> : null}

      {!loading && admin && admin.stores.length === 0 ? <EmptyModuleState title="No storefront stores" description="Create a storefront store before assigning and publishing a theme." /> : null}

      {!loading && admin && admin.stores.length > 0 ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-white/8 bg-panel p-5 shadow-card">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-text"><Store className="h-4 w-4 text-accent" />Storefront</div>
                <Select
                  value={selectedStore?.slug || ''}
                  options={admin.stores.map((store) => ({ label: `${store.name} · ${store.status}`, value: store.slug }))}
                  onChange={(event) => load(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-white/8 bg-panelMuted px-3 py-2 text-textMuted">Live: <strong className="text-text">{revision?.liveThemeKey || '—'}</strong></span>
                <span className="rounded-full border border-white/8 bg-panelMuted px-3 py-2 text-textMuted">Published v{revision?.publishedVersion || 0}</span>
                <span className={`rounded-full border px-3 py-2 ${hasChanges ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'}`}>{hasChanges ? 'Unpublished changes' : 'Draft matches live'}</span>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2"><Paintbrush className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-white">Theme gallery</h2></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {admin.themes.map((theme) => <ThemeOption key={theme.key} theme={theme} live={theme.key === revision?.liveThemeKey} draft={theme.key === themeKey && hasChanges} selected={theme.key === themeKey} onSelect={() => chooseTheme(theme)} />)}
            </div>
          </section>

          {selectedTheme ? <div className="grid gap-5 xl:grid-cols-2">
            <EditorGroup title="Content" fields={selectedTheme.editor.content} values={values} onChange={changeValue} />
            <EditorGroup title="Theme settings" fields={selectedTheme.editor.settings} values={values} onChange={changeValue} />
          </div> : null}

          <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Draft and publishing</div>
              <p className="mt-1 text-[12px] leading-5 text-textMuted">Saving a draft does not affect customers. Publish copies the draft into the live runtime settings and increments the version.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!hasChanges || Boolean(working)} onClick={() => mutate('discard')}><RotateCcw className="mr-2 h-4 w-4" />{working === 'discard' ? 'Discarding…' : 'Discard draft'}</Button>
              <Button disabled={!hasChanges || Boolean(working)} onClick={() => mutate('save')}><Save className="mr-2 h-4 w-4" />Save draft</Button>
              <PrimaryButton disabled={!selectedTheme || Boolean(working)} onClick={() => mutate('publish')}><Send className="mr-2 h-4 w-4" />Publish theme</PrimaryButton>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
