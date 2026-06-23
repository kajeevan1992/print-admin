'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Customer = { id: string; email: string; name: string; company: string };

export function CustomerAccountPage() {
  const params = useSearchParams();
  const resetToken = params.get('resetToken') || '';
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [mode, setMode] = useState(resetToken ? 'reset' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [tenantId, setTenantId] = useState('holo-print');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  async function refresh() { try { const r = await fetch('/api/internal/auth/customer/session', { cache: 'no-store' }); const p = await r.json().catch(() => ({})); if (r.ok && p?.ok) setCustomer(p.customer); } catch {} }
  useEffect(() => { void refresh(); }, []);
  async function post(path: string, body: Record<string, unknown>) { setMessage(''); const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const p = await r.json().catch(() => ({})); if (!r.ok || p?.ok === false) { setMessage(p?.error || 'Request failed.'); return null; } if (p.customer) setCustomer(p.customer); return p; }
  async function signIn() { const p = await post('/api/internal/auth/customer/signin', { email, password: passcode }); if (p) setMessage('Signed in.'); }
  async function register() { const p = await post('/api/internal/auth/customer/register', { name, email, password: passcode, tenantId }); if (p) setMessage('Account created.'); }
  async function requestReset() { const p = await post('/api/internal/auth/customer/request-reset', { email }); if (p) { setResetUrl(p.data?.resetUrl || ''); setMessage('Reset link generated. Copy/send it for now.'); } }
  async function reset() { if (passcode !== confirm) { setMessage('Passwords do not match.'); return; } const p = await post('/api/internal/auth/customer/reset-password', { token: resetToken, password: passcode }); if (p) { setMode('signin'); setMessage('Password reset. Sign in now.'); } }
  async function logout() { await fetch('/api/internal/auth/customer/logout', { method: 'POST' }).catch(() => undefined); setCustomer(null); }
  return <div className="flex min-h-screen items-center justify-center bg-background p-6"><Card className="w-full max-w-lg space-y-4"><div><h1 className="text-2xl font-semibold text-white">Customer Account</h1><p className="mt-2 text-sm text-textMuted">Storefront customer registration, sign in and reset.</p></div>{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}{customer ? <div className="space-y-3"><p className="text-white">{customer.name}</p><p className="text-sm text-textMuted">{customer.email} · {customer.company}</p><Button onClick={() => void logout()}>Logout</Button></div> : <div className="space-y-3"><div className="flex gap-2"><Button onClick={() => setMode('signin')}>Sign in</Button><Button onClick={() => setMode('register')}>Register</Button><Button onClick={() => setMode('reset')}>Reset</Button></div>{mode === 'register' ? <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /> : null}{mode === 'register' ? <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Tenant" /> : null}{mode === 'reset' && resetToken ? null : <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />}{mode === 'reset' && !resetToken ? null : <Input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Password" />}{mode === 'reset' && resetToken ? <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" /> : null}{mode === 'signin' ? <PrimaryButton onClick={() => void signIn()}>Sign in</PrimaryButton> : null}{mode === 'register' ? <PrimaryButton onClick={() => void register()}>Create account</PrimaryButton> : null}{mode === 'reset' && !resetToken ? <PrimaryButton onClick={() => void requestReset()}>Generate reset link</PrimaryButton> : null}{mode === 'reset' && resetToken ? <PrimaryButton onClick={() => void reset()}>Reset password</PrimaryButton> : null}{resetUrl ? <Input value={resetUrl} readOnly /> : null}</div>}</Card></div>;
}
