'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

export function AcceptInvitePage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!token) { setMessage('Invite token is missing.'); return; }
    if (password.length < 8) { setMessage('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/internal/auth/accept-invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name, password }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not accept invite.');
      setDone(true); setMessage('Invite accepted. You can now login.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not accept invite.'); }
    finally { setSaving(false); }
  }
  return <div className="flex min-h-screen items-center justify-center bg-background p-6"><Card className="w-full max-w-lg space-y-4"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><CheckCircle2 size={22} /></div><div><h1 className="text-xl font-semibold text-white">Accept admin invite</h1><p className="text-sm text-textMuted">Create your password to access the print admin dashboard.</p></div></div>{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}{done ? <PrimaryButton onClick={() => router.push('/login')}>Go to login</PrimaryButton> : <div className="space-y-3"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" /><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" /><PrimaryButton onClick={() => void submit()} disabled={saving}>Accept invite</PrimaryButton></div>}</Card></div>;
}
