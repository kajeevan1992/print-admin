'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';

type Field = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea';
  placeholder?: string;
  options?: SelectOption[];
  toggle?: boolean;
};

type RecordItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  [key: string]: string | boolean | undefined;
};

export function LocalRecordsPage({
  storageKey,
  title,
  subtitle,
  createLabel,
  fields,
  initialItems,
  buildCardMeta,
  buildSubtitle,
  cardMetaFields,
  subtitleFields,
  searchKeys
}: {
  storageKey: string;
  title: string;
  subtitle: string;
  createLabel: string;
  fields: Field[];
  initialItems: RecordItem[];
  buildCardMeta?: (item: RecordItem) => string;
  buildSubtitle?: (item: RecordItem) => string;
  cardMetaFields?: string[];
  subtitleFields?: string[];
  searchKeys?: string[];
}) {
  const [items, setItems] = useState<RecordItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string>(initialItems[0]?.id ?? '');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as RecordItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setItems(parsed);
        setSelectedId(parsed[0].id);
      }
    } catch {
      // ignore malformed cache
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const keys = searchKeys ?? ['title', 'subtitle', 'meta'];
      return keys.some((key) => String(item[key] ?? '').toLowerCase().includes(q));
    });
  }, [items, query, searchKeys]);

  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  const updateSelected = (changes: Record<string, string | boolean>) => {
    if (!selected) return;
    setItems((prev) => prev.map((item) => (item.id === selected.id ? { ...item, ...changes } : item)));
  };

  const createItem = () => {
    const id = `${storageKey}-${Date.now()}`;
    const item: RecordItem = {
      id,
      title: `New ${title.slice(0, -1) || 'Record'}`,
      subtitle: '',
      meta: ''
    };

    fields.forEach((field) => {
      if (field.toggle) {
        item[field.key] = false;
      } else if (field.options?.length) {
        const first = field.options[0];
        item[field.key] = typeof first === 'string' ? first : first.value;
      } else {
        item[field.key] = '';
      }
    });

    setItems((prev) => [item, ...prev]);
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (!selected) return;
    const next = items.filter((item) => item.id !== selected.id);
    setItems(next);
    setSelectedId(next[0]?.id ?? '');
  };

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<PrimaryButton onClick={createItem}>{createLabel}</PrimaryButton>}
      />

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <Input placeholder={`Search ${title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
          </Card>

          <div className="space-y-3">
            {filtered.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border p-4 text-left shadow-card transition ${active ? 'border-accent bg-panel' : 'border-border bg-panel hover:border-accent/40'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-textMuted">{buildSubtitle ? buildSubtitle(item) : (subtitleFields?.length ? subtitleFields.map((key) => String(item[key] ?? '').trim()).filter(Boolean).join(' • ') : item.subtitle)}</p>
                      <p className="mt-2 text-xs text-textMuted">{buildCardMeta ? buildCardMeta(item) : (cardMetaFields?.length ? cardMetaFields.map((key) => String(item[key] ?? '').trim()).filter(Boolean).join(' • ') : item.meta)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Edit {selected.title}</h3>
                    <p className="text-sm text-textMuted">Update the selected record and changes are saved locally.</p>
                  </div>
                  <Button onClick={deleteSelected}>Delete</Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium">Title</span>
                    <Input value={String(selected.title ?? '')} onChange={(event) => updateSelected({ title: event.target.value })} />
                  </label>

                  {fields.map((field) => {
                    const value = selected[field.key];

                    if (field.toggle) {
                      return (
                        <div key={field.key} className="flex items-center justify-between rounded-lg border border-border bg-panelMuted px-3 py-2">
                          <span className="text-sm">{field.label}</span>
                          <Toggle checked={Boolean(value)} onChange={(checked) => updateSelected({ [field.key]: checked })} />
                        </div>
                      );
                    }

                    if (field.options) {
                      return (
                        <label key={field.key} className="space-y-2">
                          <span className="text-sm font-medium">{field.label}</span>
                          <Select value={String(value ?? '')} options={field.options} onChange={(event) => updateSelected({ [field.key]: event.target.value })} />
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
                            onChange={(event) => updateSelected({ [field.key]: event.target.value })}
                            className="min-h-28 w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm outline-none focus:border-accent"
                          />
                        </label>
                      );
                    }

                    return (
                      <label key={field.key} className="space-y-2">
                        <span className="text-sm font-medium">{field.label}</span>
                        <Input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={String(value ?? '')}
                          placeholder={field.placeholder}
                          onChange={(event) => updateSelected({ [field.key]: event.target.value })}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">No records found yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
