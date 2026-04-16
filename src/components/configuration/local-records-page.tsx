'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, CheckCheck, CheckCircle2, Copy, Download, Filter, Pin, RotateCcw, Search, Star, Trash2, Upload } from 'lucide-react';
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
  pinned?: boolean;
  starred?: boolean;
  createdAt?: string;
  [key: string]: string | boolean | undefined;
};

type QuickTemplate = {
  label: string;
  values: Record<string, string | boolean>;
};

const sortOptions = [
  { value: 'recent', label: 'Newest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'status', label: 'Status' },
  { value: 'owner', label: 'Owner / Assignee' }
];

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
  searchKeys,
  primaryFilterKey,
  quickTemplates = []
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
  primaryFilterKey?: string;
  quickTemplates?: QuickTemplate[];
}) {
  const seedItems = useMemo(
    () => initialItems.map((item, index) => ({ ...item, createdAt: item.createdAt ?? new Date(Date.now() - index * 1000 * 60 * 30).toISOString(), pinned: Boolean(item.pinned), starred: Boolean(item.starred) })),
    [initialItems]
  );

  const [items, setItems] = useState<RecordItem[]>(seedItems);
  const [selectedId, setSelectedId] = useState<string>(seedItems[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as RecordItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setItems(parsed.map((item) => ({ pinned: false, starred: false, ...item, createdAt: item.createdAt ?? new Date().toISOString() })));
        setSelectedId(parsed[0].id);
      }
    } catch {
      // ignore malformed cache
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  const filterField = fields.find((field) => field.key === primaryFilterKey);
  const filterOptions = useMemo(() => {
    if (!filterField?.options) return [];
    return filterField.options.map((option) => (typeof option === 'string' ? option : option.value));
  }, [filterField]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = items.filter((item) => {
      const keys = searchKeys ?? ['title', 'subtitle', 'meta'];
      const matchesQuery = !q || keys.some((key) => String(item[key] ?? '').toLowerCase().includes(q));
      const matchesFilter = activeFilter === 'all' || !primaryFilterKey || String(item[primaryFilterKey] ?? '') === activeFilter;
      const attentionState = [String(item.priority ?? ''), String(item.type ?? ''), String(item.status ?? '')].join(' ').toLowerCase();
      const matchesAttention = !attentionOnly || /(criticalhigh|warningsecurity|blockeddue-soonpending|open)/.test(attentionState);
      return matchesQuery && matchesFilter && matchesAttention;
    });

    return result.sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      if (sortBy === 'title') return String(a.title).localeCompare(String(b.title));
      if (sortBy === 'status') return String(a.status ?? '').localeCompare(String(b.status ?? ''));
      if (sortBy === 'owner') return String(a.owner ?? a.assignee ?? '').localeCompare(String(b.owner ?? b.assignee ?? ''));
      return String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''));
    });
  }, [activeFilter, attentionOnly, items, primaryFilterKey, query, searchKeys, sortBy]);

  const selected = items.find((item) => item.id === selectedId) ?? filtered[0] ?? items[0] ?? null;

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

  const stats = useMemo(() => {
    const completed = items.filter((item) => ['done', 'resolved'].includes(String(item.status ?? ''))).length;
    const urgent = items.filter((item) => ['critical', 'high', 'warning', 'security', 'due-soon', 'blocked', 'pending', 'open'].includes(String(item.priority ?? item.type ?? item.status ?? ''))).length;
    const pinned = items.filter((item) => item.pinned).length;
    const starred = items.filter((item) => item.starred).length;
    return {
      total: items.length,
      showing: filtered.length,
      completed,
      urgent,
      pinned,
      starred
    };
  }, [filtered.length, items]);

  const updateSelected = (changes: Record<string, string | boolean>) => {
    if (!selected) return;
    setItems((prev) => prev.map((item) => (item.id === selected.id ? { ...item, ...changes } : item)));
  };

  const createItem = (template?: QuickTemplate) => {
    const id = `${storageKey}-${Date.now()}`;
    const item: RecordItem = {
      id,
      title: template?.values.title ? String(template.values.title) : `New ${title.replace(/s$/,'') || 'Record'}`,
      subtitle: '',
      meta: '',
      pinned: false,
      starred: false,
      createdAt: new Date().toISOString()
    };

    fields.forEach((field) => {
      if (template?.values[field.key] !== undefined) {
        item[field.key] = template.values[field.key] as string | boolean;
      } else if (field.toggle) {
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

  const duplicateSelected = () => {
    if (!selected) return;
    const id = `${storageKey}-${Date.now()}`;
    const clone = {
      ...selected,
      id,
      title: `${selected.title} Copy`,
      createdAt: new Date().toISOString()
    };
    setItems((prev) => [clone, ...prev]);
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (!selected) return;
    const next = items.filter((item) => item.id !== selected.id);
    setItems(next);
    setSelectedId(next[0]?.id ?? '');
  };

  const markSelectedDone = () => {
    if (!selected) return;
    if (!fields.some((field) => field.key === 'status')) return;
    updateSelected({ status: 'done' });
  };

  const toggleSelectedPin = () => {
    if (!selected) return;
    updateSelected({ pinned: !selected.pinned });
  };

  const toggleSelectedStar = () => {
    if (!selected) return;
    updateSelected({ starred: !selected.starred });
  };

  const exportItems = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${storageKey}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importItems = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as RecordItem[];
      if (Array.isArray(parsed) && parsed.length) {
        const hydrated = parsed.map((item) => ({ pinned: false, starred: false, ...item, createdAt: item.createdAt ?? new Date().toISOString() }));
        setItems(hydrated);
        setSelectedId(hydrated[0].id);
      }
    } catch {
      alert('Could not import JSON file.');
    } finally {
      event.target.value = '';
    }
  };

  const resetItems = () => {
    setItems(seedItems);
    setSelectedId(seedItems[0]?.id ?? '');
    setActiveFilter('all');
    setQuery('');
    setSortBy('recent');
    setAttentionOnly(false);
  };

  const longNotes = [selected?.checklist, selected?.message, selected?.filterSummary, selected?.notes].find((value) => String(value ?? '').trim().length > 0);
  const checklistItems = String(longNotes ?? '')
    .split(/[\n;,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const detailPairs = selected
    ? fields
        .filter((field) => field.key !== 'message' && field.key !== 'checklist' && field.key !== 'filterSummary' && field.key !== 'notes')
        .map((field) => ({ label: field.label, value: String(selected[field.key] ?? '').trim() }))
        .filter((item) => item.value)
    : [];

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
                actions={<PrimaryButton onClick={() => createItem()}>{createLabel}</PrimaryButton>}
              />
              <p className="max-w-2xl text-[13px] leading-6 text-textMuted">Use this product-grade front-end workflow to shape how teams will actually manage records before APIs and database wiring are introduced.</p>
              {quickTemplates.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickTemplates.map((template) => (
                    <Button key={template.label} onClick={() => createItem(template)}>{template.label}</Button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="border-t border-white/6 bg-white/[0.02] p-6 md:border-l md:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Overview</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {[
                { label: 'Total records', value: stats.total },
                { label: 'Filtered view', value: stats.showing },
                { label: 'Resolved', value: stats.completed },
                { label: 'Needs attention', value: stats.urgent },
                { label: 'Pinned', value: stats.pinned },
                { label: 'Starred', value: stats.starred }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="space-y-3 p-3">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <Input className="pl-9" placeholder={`Search ${title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
              {filterOptions.length ? (
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-textMuted"><Filter size={12} /> Filter</div>
                  <Select value={activeFilter} options={['all', ...filterOptions]} onChange={(event) => setActiveFilter(event.target.value)} />
                </div>
              ) : null}
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-textMuted"><ArrowUpDown size={12} /> Sort</div>
                <Select value={sortBy} options={sortOptions} onChange={(event) => setSortBy(event.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
              <div>
                <p className="text-sm font-medium text-white">Attention mode</p>
                <p className="text-[12px] text-textMuted">Focus on records that need action.</p>
              </div>
              <Toggle checked={attentionOnly} onChange={setAttentionOnly} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={duplicateSelected} disabled={!selected}><Copy size={13} className="mr-1" /> Duplicate</Button>
              <Button onClick={exportItems}><Download size={13} className="mr-1" /> Export</Button>
              <Button onClick={() => importRef.current?.click()}><Upload size={13} className="mr-1" /> Import</Button>
              <Button onClick={resetItems}><RotateCcw size={13} className="mr-1" /> Reset</Button>
              <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={importItems} />
            </div>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14px] font-semibold text-white">{item.title}</h3>
                        {item.pinned ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-200"><Pin size={10} /> Pinned</span> : null}
                        {item.starred ? <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-cyan-200"><Star size={10} /> Starred</span> : null}
                      </div>
                      <p className="mt-1 text-[11px] text-textMuted">{subtitleTextForItem(item)}</p>
                      <p className="mt-2 text-[12px] text-textMuted">{cardMetaTextForItem(item)}</p>
                    </div>
                    {String(item.status ?? '') === 'done' || String(item.status ?? '') === 'resolved' ? <CheckCircle2 size={16} className="text-emerald-400" /> : null}
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">Edit {selected.title}</h3>
                    <p className="text-sm text-textMuted">Update the selected record and changes are saved locally.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={toggleSelectedPin}>{selected.pinned ? <><Pin size={13} className="mr-1" /> Unpin</> : <><Pin size={13} className="mr-1" /> Pin</>}</Button>
                    <Button onClick={toggleSelectedStar}>{selected.starred ? <><Star size={13} className="mr-1" /> Unstar</> : <><Star size={13} className="mr-1" /> Star</>}</Button>
                    {fields.some((field) => field.key === 'status') ? <Button onClick={markSelectedDone}><CheckCheck size={13} className="mr-1" /> Mark done</Button> : null}
                    <Button onClick={deleteSelected}><Trash2 size={13} className="mr-1" /> Delete</Button>
                  </div>
                </div>

                {detailPairs.length ? (
                  <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:grid-cols-2 xl:grid-cols-3">
                    {detailPairs.slice(0, 6).map((pair) => (
                      <div key={pair.label}>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">{pair.label}</p>
                        <p className="mt-1 text-sm text-white">{pair.value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

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

          {checklistItems.length ? (
            <Card>
              <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Detail preview</p>
              <div className="mt-4 space-y-3">
                {checklistItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <CheckCircle2 size={14} className="mt-0.5 text-accentAlt" />
                    <p className="text-[12px] leading-6 text-textMuted">{item}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
