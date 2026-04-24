'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type ListItem = {
  id?: string;
  title: string;
  subtitle: string;
  meta?: string;
};

type DbStatus = 'loading' | 'connected' | 'saving' | 'local' | 'error';

function normaliseItems(items: ListItem[], prefix: string): Required<ListItem>[] {
  return items.map((item, index) => ({
    id: item.id || `${prefix}-${index + 1}`,
    title: item.title,
    subtitle: item.subtitle,
    meta: item.meta || ''
  }));
}

export function SimpleListPage({
  title,
  subtitle,
  actionLabel,
  items,
  storageKey
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  items: ListItem[];
  storageKey?: string;
}) {
  const defaultItems = useMemo(() => normaliseItems(items, storageKey || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')), [items, storageKey, title]);
  const [records, setRecords] = useState<Required<ListItem>[]>(defaultItems);
  const [selectedId, setSelectedId] = useState(defaultItems[0]?.id || '');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<DbStatus>(storageKey ? 'loading' : 'local');
  const [message, setMessage] = useState(storageKey ? 'Loading records from internal API...' : 'Static view. No database sync configured yet.');

  useEffect(() => {
    if (!storageKey) {
      setRecords(defaultItems);
      setSelectedId(defaultItems[0]?.id || '');
      setStatus('local');
      setMessage('Static view. No database sync configured yet.');
      return;
    }

    let cancelled = false;
    async function loadRecords() {
      setStatus('loading');
      setMessage('Loading records from internal API...');
      try {
        const response = await fetch(`/api/internal/config/${encodeURIComponent(storageKey)}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal config API failed.');
        const saved = payload?.data?.metadataJson?.items;
        const next = Array.isArray(saved) && saved.length ? normaliseItems(saved, storageKey) : defaultItems;
        if (!cancelled) {
          setRecords(next);
          setSelectedId(next[0]?.id || '');
          setStatus('connected');
          setMessage(Array.isArray(saved) && saved.length ? 'Connected to database. Records loaded from internal API.' : 'Connected to database. Showing starter records until you save changes.');
        }
      } catch (error) {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { items?: ListItem[] };
            if (Array.isArray(parsed.items)) {
              const next = normaliseItems(parsed.items, storageKey);
              if (!cancelled) {
                setRecords(next);
                setSelectedId(next[0]?.id || '');
                setStatus('local');
                setMessage(`Internal API unavailable, showing browser fallback: ${error instanceof Error ? error.message : 'unknown error'}`);
              }
              return;
            }
          } catch {
            // Continue to error state.
          }
        }
        if (!cancelled) {
          setRecords(defaultItems);
          setSelectedId(defaultItems[0]?.id || '');
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Records could not be loaded.');
        }
      }
    }
    void loadRecords();
    return () => { cancelled = true; };
  }, [defaultItems, storageKey]);

  const selected = records.find((item) => item.id === selectedId) || records[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((item) => `${item.title} ${item.subtitle} ${item.meta ?? ''}`.toLowerCase().includes(q));
  }, [records, query]);

  const persist = async (nextRecords: Required<ListItem>[], nextMessage = 'Saving records through internal API...') => {
    if (!storageKey) return;
    setStatus('saving');
    setMessage(nextMessage);
    try {
      const response = await fetch(`/api/internal/config/${encodeURIComponent(storageKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: subtitle, items: nextRecords, values: { count: String(nextRecords.length) } })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal config API save failed.');
      window.localStorage.setItem(storageKey, JSON.stringify({ items: nextRecords, savedAt: new Date().toISOString() }));
      setStatus('connected');
      setMessage('Saved to database through internal API.');
    } catch (error) {
      window.localStorage.setItem(storageKey, JSON.stringify({ items: nextRecords, savedAt: new Date().toISOString() }));
      setStatus('local');
      setMessage(`Database save failed, kept browser fallback copy: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  };

  const setAndPersist = (nextRecords: Required<ListItem>[]) => {
    setRecords(nextRecords);
    void persist(nextRecords);
  };

  const addRecord = () => {
    const id = `${storageKey || 'simple'}-${Date.now()}`;
    const record = { id, title: `New ${title.replace(/s$/, '')}`, subtitle: 'Add details here', meta: '' };
    const next = [record, ...records];
    setRecords(next);
    setSelectedId(id);
    void persist(next, 'Creating record through internal API...');
  };

  const updateSelected = (changes: Partial<ListItem>) => {
    if (!selected) return;
    const next = records.map((item) => (item.id === selected.id ? { ...item, ...changes } : item));
    setAndPersist(next);
  };

  const deleteSelected = () => {
    if (!selected) return;
    const next = records.filter((item) => item.id !== selected.id);
    setRecords(next);
    setSelectedId(next[0]?.id || '');
    void persist(next, 'Deleting record through internal API...');
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const id = `${storageKey || 'simple'}-${Date.now()}`;
    const clone = { ...selected, id, title: `${selected.title} Copy` };
    const next = [clone, ...records];
    setRecords(next);
    setSelectedId(id);
    void persist(next, 'Duplicating record through internal API...');
  };

  const resetRecords = async () => {
    setRecords(defaultItems);
    setSelectedId(defaultItems[0]?.id || '');
    if (!storageKey) return;
    window.localStorage.removeItem(storageKey);
    try {
      await fetch(`/api/internal/config/${encodeURIComponent(storageKey)}`, { method: 'DELETE' });
      setStatus('connected');
      setMessage('Records reset in database.');
    } catch (error) {
      setStatus('local');
      setMessage(`Browser fallback reset. Database reset failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  };

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} actions={<PrimaryButton onClick={addRecord}>{actionLabel}</PrimaryButton>} />

      <div className="mb-4 rounded-xl border border-border bg-panel px-4 py-3 text-sm">
        <span className={status === 'connected' ? 'text-emerald-300' : status === 'error' ? 'text-red-300' : status === 'saving' ? 'text-amber-300' : status === 'local' ? 'text-amber-300' : 'text-textMuted'}>
          {status === 'connected' ? 'Database connected' : status === 'error' ? 'Database issue' : status === 'saving' ? 'Saving to database' : status === 'local' ? 'Local fallback' : 'Checking database'}
        </span>
        <span className="ml-2 text-textMuted">{message}</span>
      </div>

      <Card className="mb-4">
        <Input placeholder={`Search ${title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id} className={item.id === selectedId ? 'border-accent/40' : undefined}>
              <div className="block w-full cursor-pointer text-left" role="button" tabIndex={0} onClick={() => setSelectedId(item.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(item.id); }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-textMuted">{item.subtitle}</p>
                    {item.meta ? <p className="mt-2 text-xs text-textMuted">{item.meta}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}>Edit</Button>
                    <Button type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}>View</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card>
          {selected ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold">Edit selected record</h3>
                <p className="text-sm text-textMuted">Changes save to the internal config API when this page has a storage key.</p>
              </div>
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Title</span>
                <Input value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Subtitle</span>
                <Input value={selected.subtitle} onChange={(event) => updateSelected({ subtitle: event.target.value })} />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Meta / notes</span>
                <Input value={selected.meta || ''} onChange={(event) => updateSelected({ meta: event.target.value })} />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={duplicateSelected}>Duplicate</Button>
                <Button onClick={deleteSelected}>Delete</Button>
                <Button onClick={resetRecords}>Reset</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-textMuted">No records yet. Use {actionLabel} to create one.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
