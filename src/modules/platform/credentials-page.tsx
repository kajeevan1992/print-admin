'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Row = { id: string; name: string; prefix: string; status: string; environment: string; scopes: string[]; lastUsedAt: string };

export function CredentialsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState('Storefront Integration');
  const [scopes, setScopes] = useState('catalog:read, orders:write');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  async function load() { const r = await fetch('/api/internal/platform/credentials/health', { cache: 'no-store' }); const p = await r.json().catch(() => ({})); if (!r.ok || p?.ok === false) { setMessage(p?.error || 'Could not load credentials.'); return; } setRows(p.data?.items || []); }
  async function create() { const r = await fetch('/api/internal/platform/token-factory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, scopes, type: 'secret', environment: 'production', status: 'active' }) }); const p = await r.json().catch(() => ({})); if (!r.ok || p?.ok === false) { setMessage(p?.error || 'Could not create credential.'); return; } setToken(p.data?.secret || ''); setRows(p.data?.items || []); setMessage('Created. Copy the token now; it is shown once.'); }
  useEffect(() => { void load(); }, []);
  return <div className="space-y-4"><div><h1 className="text-2xl font-semibold text-white">API Credentials</h1><p className="mt-2 text-sm text-textMuted">DB-backed credentials with hashed storage and signing support.</p></div>{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}{token ? <Card><p className="text-xs uppercase tracking-wide text-textMuted">Token shown once</p><Input value={token} readOnly /></Card> : null}<Card className="space-y-3"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /><Input value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="catalog:read, orders:write" /><PrimaryButton onClick={() => void create()}>Create credential</PrimaryButton></Card><Card><Button onClick={() => void load()}>Refresh</Button><div className="mt-3 space-y-2">{rows.map((row) => <div key={row.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm"><p className="font-semibold text-white">{row.name}</p><p className="text-xs text-textMuted">{row.prefix} · {row.status} · {row.scopes.join(', ') || 'no scopes'} · last used {row.lastUsedAt}</p></div>)}</div></Card></div>;
}
