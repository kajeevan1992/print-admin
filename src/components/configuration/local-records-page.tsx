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

  const subtitleTextForItem = (item: RecordItem) => {
    if (buildSubtitle) return buildSubtitle(item);
    if (subtitleFields?.length) {
      return subtitleFields
        .map((key) => String(item[key] ?? '').trim())
        .filter(Boolean)
        .join(' • ');
    }
    return item.subtitle ?? '';
  };

  const cardMetaTextForItem = (item: RecordItem) => {
    if (buildCardMeta) return buildCardMeta(item);
    if (cardMetaFields?.length) {
      return cardMetaFields
        .map((key) => String(item[key] ?? '').trim())
        .filter(Boolean)
        .join(' • ');
    }
    return item.meta ?? '';
  };

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
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden p-6 md:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_26%)]" />
            <div className="relative">
              <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<PrimaryButton onClick={createItem}>{createLabel}</PrimaryButton>}
      />
              <p className="max-w-2xl text-sm leading-6 text-textMuted">Use a lighter local workflow for fast prototyping and admin reviews before wiring everything to live APIs.</p>
            </div>
          </div>
          <div className="border-t border-white/6 bg-white/[0.02] p-6 md:border-l md:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Workflow notes</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">Fast edits</p>
                <p className="mt-1 text-[13px] leading-6 text-textMuted">Switch between records and keep changes automatically saved in browser state.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">Cleaner cards</p>
                <p className="mt-1 text-[13px] leading-6 text-textMuted">Smaller typography and softer surfaces create a calmer, more premium rhythm.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="p-3">
            <Input placeholder={`Search ${title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
          </Card>

          <div className="space-y-3">
            {filtered.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left shadow-card transition ${active ? 'border-accent/35 bg-white/[0.04]' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-[13px] text-textMuted">{subtitleTextForItem(item)}</p>
                      <p className="mt-2 text-[12px] text-textMuted">{cardMetaTextForItem(item)}</p>
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
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">Edit {selected.title}</h3>
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
                        <div key={field.key} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
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
                            className="min-h-28 w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-accent"
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
