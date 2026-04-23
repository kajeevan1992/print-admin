'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DatabaseManagerRecord } from './database-manager-types';

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

export function DatabaseManagerPage() {
  const [records, setRecords] = useState<DatabaseManagerRecord[]>([]);
  const [form, setForm] = useState<DatabaseManagerRecord>(emptyRecord);
  const [message, setMessage] = useState('Platform DB stays in environment variables. Tenant/site DBs are managed here.');
  const [loading, setLoading] = useState(true);

  const canSubmit = useMemo(
    () => form.tenantId && form.label && form.host && form.port && form.database && form.username,
    [form]
  );

  async function loadRecords() {
    setLoading(true);
    try {
      const res = await fetch('/api/internal/database-connections', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      setRecords(Array.isArray(payload?.data) ? payload.data : []);
      setMessage(payload?.ok ? 'Loaded database connections from internal core storage.' : 'Could not load database connections.');
    } catch {
      setMessage('Database connection storage route failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  function update<K extends keyof DatabaseManagerRecord>(key: K, value: DatabaseManagerRecord[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveRecord(next: DatabaseManagerRecord) {
    try {
      const res = await fetch('/api/internal/database-connections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
      const payload = await res.json().catch(() => null);
      setMessage(payload?.message || (payload?.ok ? 'Connection saved.' : 'Connection save failed.'));
      setForm(emptyRecord);
      await loadRecords();
    } catch {
      setMessage('Connection save route failed.');
    }
  }

  async function testConnection(record: DatabaseManagerRecord) {
    setMessage(`Testing ${record.label}...`);
    try {
      const res = await fetch('/api/internal/database-connections/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: record.id }),
      });
      const payload = await res.json().catch(() => null);
      setMessage(payload?.message || (payload?.ok ? 'Connection successful.' : 'Connection failed.'));
      await loadRecords();
    } catch {
      setMessage('Connection test route failed.');
    }
  }

  async function setupDatabase(record: DatabaseManagerRecord) {
    setMessage(`Running setup checks for ${record.label}...`);
    try {
      const res = await fetch('/api/internal/database-connections/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: record.id }),
      });
      const payload = await res.json().catch(() => null);
      const steps = Array.isArray(payload?.steps) ? payload.steps.map((s: any) => `${s.name}: ${s.message}`).join(' | ') : '';
      setMessage(`${payload?.message || 'Setup completed.'}${steps ? ` — ${steps}` : ''}`);
    } catch {
      setMessage('Database setup route failed.');
    }
  }

  async function backupDatabase(record: DatabaseManagerRecord) {
    setMessage(`Starting backup hook for ${record.label}...`);
    try {
      const res = await fetch('/api/internal/database-connections/backup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: record.id }),
      });
      const payload = await res.json().catch(() => null);
      setMessage(payload?.message || (payload?.ok ? 'Backup hook completed.' : 'Backup hook failed.'));
    } catch {
      setMessage('Backup route failed.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Database Manager</h1>
        <p className="mt-2 max-w-4xl text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Super Admin module for tenant/site database connections, connection testing, setup checks and backup hooks.
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
            Save encrypted connection
          </button>
          <button type="button" onClick={() => setForm(emptyRecord)} className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}>
            Clear
          </button>
          <button type="button" onClick={loadRecords} className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}>
            {loading ? 'Refreshing...' : 'Refresh'}
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
                <button type="button" className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }} onClick={() => setupDatabase(record)}>
                  Run setup checks
                </button>
                <button type="button" className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }} onClick={() => backupDatabase(record)}>
                  Run backup hook
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
