'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DatabaseManagerRecord } from './database-manager-types';

const STORAGE_KEY = 'print-platform-database-manager-records';

const emptyRecord: DatabaseManagerRecord = {
  id: '',
  tenantId: '',
  scope: 'tenant',
  label: '',
  host: '',
  port: '5432',
  database: '',
  username: '',
  password: '',
  sslMode: 'prefer',
  status: 'untested',
};

function createId() {
  return `db_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadRecords(): DatabaseManagerRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecords(records: DatabaseManagerRecord[]) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function DatabaseManagerPage() {
  const [records, setRecords] = useState<DatabaseManagerRecord[]>([]);
  const [form, setForm] = useState<DatabaseManagerRecord>(emptyRecord);
  const [message, setMessage] = useState('Platform DB stays in environment variables. Tenant/site DBs can be managed here.');

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  const canSubmit = useMemo(
    () => form.tenantId && form.label && form.host && form.port && form.database && form.username,
    [form]
  );

  function update<K extends keyof DatabaseManagerRecord>(key: K, value: DatabaseManagerRecord[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function saveRecord(next: DatabaseManagerRecord) {
    const saved = next.id ? next : { ...next, id: createId(), status: 'untested' as const };
    const updated = records.some((record) => record.id === saved.id)
      ? records.map((record) => (record.id === saved.id ? saved : record))
      : [saved, ...records];
    setRecords(updated);
    saveRecords(updated);
    setForm(emptyRecord);
    setMessage('Connection saved locally. Encrypted server storage is next.');
  }

  async function testConnection(record: DatabaseManagerRecord) {
    setMessage(`Testing ${record.label}...`);
    try {
      const res = await fetch('/api/internal/database-connections/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
      });
      const payload = await res.json().catch(() => null);
      const status = payload?.ok ? 'connected' : 'failed';
      const updated = records.map((item) =>
        item.id === record.id ? { ...item, status, lastTestedAt: new Date().toISOString() } : item
      );
      setRecords(updated);
      saveRecords(updated);
      setMessage(payload?.message || (payload?.ok ? 'Connection successful.' : 'Connection failed.'));
    } catch {
      setMessage('Connection test route failed.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Database Manager</h1>
        <p className="mt-2 max-w-4xl text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Super Admin foundation for tenant/site database connections, setup, future backups and database isolation.
        </p>
      </div>

      <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
        <p className="text-sm font-semibold">Connection details</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="rounded-2xl border px-4 py-3 text-sm" placeholder="Tenant ID" value={form.tenantId} onChange={(e) => update('tenantId', e.target.value)} />
          <input className="rounded-2xl border px-4 py-3 text-sm" placeholder="Site ID optional" value={form.siteId || ''} onChange={(e) => update('siteId', e.target.value)} />
          <select className="rounded-2xl border px-4 py-3 text-sm" value={form.scope} onChange={(e) => update('scope', e.target.value as DatabaseManagerRecord['scope'])}>
            <option value="tenant">Tenant database</option>
            <option value="site">Site database</option>
          </select>
          <input className="rounded-2xl border px-4 py-3 text-sm" placeholder="Label" value={form.label} onChange={(e) => update('label', e.target.value)} />
          <input className="rounded-2xl border px-4 py-3 text-sm" placeholder="Host" value={form.host} onChange={(e) => update('host', e.target.value)} />
          <input className="rounded-2xl border px-4 py-3 text-sm" placeholder="Port" value={form.port} onChange={(e) => update('port', e.target.value)} />
          <input className="rounded-2xl border px-4 py-3 text-sm" placeholder="Database" value={form.database} onChange={(e) => update('database', e.target.value)} />
          <input className="rounded-2xl border px-4 py-3 text-sm" placeholder="Username" value={form.username} onChange={(e) => update('username', e.target.value)} />
          <input className="rounded-2xl border px-4 py-3 text-sm" placeholder="Password" type="password" value={form.password || ''} onChange={(e) => update('password', e.target.value)} />
          <select className="rounded-2xl border px-4 py-3 text-sm" value={form.sslMode} onChange={(e) => update('sslMode', e.target.value as DatabaseManagerRecord['sslMode'])}>
            <option value="prefer">SSL prefer</option>
            <option value="require">SSL require</option>
            <option value="disable">SSL disable</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={!canSubmit} onClick={() => saveRecord(form)} className="rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}>
            Save connection
          </button>
          <button type="button" onClick={() => setForm(emptyRecord)} className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}>
            Clear
          </button>
        </div>
        <div className="mt-4 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
          {message}
        </div>
      </div>

      <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
        <p className="text-sm font-semibold">Saved database connections</p>
        <div className="mt-4 space-y-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{record.label}</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {record.scope} · tenant {record.tenantId} · {record.host}:{record.port}/{record.database}
                  </p>
                </div>
                <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>
                  {record.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }} onClick={() => testConnection(record)}>
                  Test connection
                </button>
                <button type="button" className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }} onClick={() => setForm(record)}>
                  Edit
                </button>
              </div>
            </div>
          ))}
          {!records.length ? (
            <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
              No tenant database connections saved yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
