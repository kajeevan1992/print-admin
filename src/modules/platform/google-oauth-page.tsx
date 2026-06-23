'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';

type Status = { configured: boolean; allowedDomains: string[]; linkedAccounts: number; redirectPath: string };

export function GoogleOAuthPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState('');
  async function load() {
    try {
      const response = await fetch('/api/internal/auth/google/status', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Google OAuth status could not load.');
      setStatus(payload.data);
      setMessage('Google OAuth status refreshed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Google OAuth status could not load.'); }
  }
  useEffect(() => { void load(); }, []);
  return <div className="space-y-4"><PageHeader title="Google OAuth" subtitle="Invite-only Google login status and setup checks." actions={<Button onClick={() => void load()}><RefreshCw size={14} /> Refresh</Button>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<div className="grid gap-4 md:grid-cols-3"><Metric label="Configured" value={status?.configured ? 'Yes' : 'No'} /><Metric label="Linked accounts" value={status?.linkedAccounts ?? 0} /><Metric label="Allowed domains" value={status?.allowedDomains?.length || 'Any invited'} /></div><Card><h3 className="text-sm font-semibold text-white">Required Google redirect URI</h3><p className="mt-2 text-sm text-textMuted">Add this path in Google Cloud OAuth consent/app credentials:</p><code className="mt-3 block rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-cyan-100">{status?.redirectPath || '/api/internal/auth/google/callback'}</code><p className="mt-4 text-sm text-textMuted">Environment variables: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, optional GOOGLE_OAUTH_ALLOWED_DOMAINS.</p></Card></div>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
