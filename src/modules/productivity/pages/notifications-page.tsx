'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Clock3, Mail, MessageSquare, Send } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Notification = {
  id: string;
  event: string;
  orderNumber: string;
  recipient: string;
  channel: string;
  status: string;
  subject: string;
  message: string;
  priority: string;
  createdAt: string;
};

const endpoint = '/api/internal/config/customer-communications-v378';
const itemsEndpoint = `${endpoint}/items`;
const ticketEndpoint = '/api/internal/config/production-job-tickets/items';
const revisionEndpoint = '/api/internal/config/customer-proof-revisions-v377/items';

function now() {
  return new Date().toISOString();
}

async function readItems<T>(url: string): Promise<T[]> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    return Array.isArray(payload.data?.items) ? payload.data.items : [];
  } catch {
    return [];
  }
}

async function write(items: Notification[]) {
  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Customer Communications',
      description: 'Notifications automation engine for customers, staff and webhook-ready events',
      items,
      values: { count: String(items.length), version: 'v378' }
    })
  });
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [suggested, setSuggested] = useState<Notification[]>([]);
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<Notification>({
    id: '',
    event: 'manual-message',
    orderNumber: '',
    recipient: '',
    channel: 'email',
    status: 'draft',
    subject: '',
    message: '',
    priority: 'normal',
    createdAt: now()
  });

  async function load() {
    const [existing, tickets, revisions] = await Promise.all([
      readItems<Notification>(itemsEndpoint),
      readItems<any>(ticketEndpoint),
      readItems<any>(revisionEndpoint)
    ]);
    setNotifications(existing);

    const auto: Notification[] = [];
    tickets.forEach((ticket: any) => {
      if (ticket.artworkStatus === 'not-uploaded' || ticket.status === 'artwork-check') {
        auto.push({
          id: `artwork-${ticket.orderNumber}`,
          event: 'artwork-upload-reminder',
          orderNumber: ticket.orderNumber,
          recipient: ticket.customerName || 'Customer',
          channel: 'email',
          status: 'draft',
          subject: `Artwork needed for ${ticket.orderNumber}`,
          message: `Please upload artwork for ${ticket.productName || 'your print order'} so production can continue.`,
          priority: 'high',
          createdAt: now()
        });
      }
      if (ticket.customerProofStatus === 'pending-customer-approval' || ticket.artworkStatus === 'preflight-pass') {
        auto.push({
          id: `proof-${ticket.orderNumber}`,
          event: 'proof-approval-reminder',
          orderNumber: ticket.orderNumber,
          recipient: ticket.customerName || 'Customer',
          channel: 'email',
          status: 'draft',
          subject: `Proof approval needed for ${ticket.orderNumber}`,
          message: 'Your proof is ready. Please approve it for print or request changes. Production remains on hold until approval is complete.',
          priority: 'urgent',
          createdAt: now()
        });
      }
      if (ticket.status === 'blocked' || ticket.artworkStatus === 'preflight-fail') {
        auto.push({
          id: `blocked-${ticket.orderNumber}`,
          event: 'production-blocked-alert',
          orderNumber: ticket.orderNumber,
          recipient: 'Production Team',
          channel: 'internal',
          status: 'draft',
          subject: `Production blocked: ${ticket.orderNumber}`,
          message: (ticket.warnings || []).join(' ') || 'Artwork/proofing issue detected before production.',
          priority: 'urgent',
          createdAt: now()
        });
      }
      if (ticket.status === 'ready-to-print') {
        auto.push({
          id: `ready-${ticket.orderNumber}`,
          event: 'ready-to-print-update',
          orderNumber: ticket.orderNumber,
          recipient: ticket.customerName || 'Customer',
          channel: 'email',
          status: 'draft',
          subject: `${ticket.orderNumber} is ready for production`,
          message: 'Your artwork has been approved and your job is now ready for print production.',
          priority: 'normal',
          createdAt: now()
        });
      }
      if (ticket.status === 'dispatched') {
        auto.push({
          id: `dispatch-${ticket.orderNumber}`,
          event: 'dispatch-notification',
          orderNumber: ticket.orderNumber,
          recipient: ticket.customerName || 'Customer',
          channel: 'email',
          status: 'draft',
          subject: `${ticket.orderNumber} has been dispatched`,
          message: 'Your print order has been dispatched. Thank you for printing with us.',
          priority: 'normal',
          createdAt: now()
        });
      }
    });

    revisions.forEach((revision: any) => {
      if (revision.action === 'revision-requested') {
        auto.push({
          id: `revision-${revision.orderNumber}-${revision.version}`,
          event: 'revision-requested',
          orderNumber: revision.orderNumber,
          recipient: revision.customer || 'Customer',
          channel: 'email',
          status: 'draft',
          subject: `Revision request logged for ${revision.orderNumber}`,
          message: revision.comment || 'Artwork revisions requested. Production is on hold until the revised proof is approved.',
          priority: 'high',
          createdAt: now()
        });
      }
      if (revision.action === 'approved') {
        auto.push({
          id: `approved-${revision.orderNumber}-${revision.version}`,
          event: 'proof-approved-confirmation',
          orderNumber: revision.orderNumber,
          recipient: revision.customer || 'Customer',
          channel: 'email',
          status: 'draft',
          subject: `Proof approved for ${revision.orderNumber}`,
          message: 'Your proof approval has been recorded and the job has been released to production.',
          priority: 'normal',
          createdAt: now()
        });
      }
    });

    const existingIds = new Set(existing.map((item) => item.id));
    setSuggested(auto.filter((item) => !existingIds.has(item.id)));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => notifications.filter((item) => {
    const haystack = `${item.event} ${item.orderNumber} ${item.recipient} ${item.subject} ${item.message}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (channel === 'all' || item.channel === channel) && (status === 'all' || item.status === status);
  }), [notifications, query, channel, status]);

  async function saveAll(next: Notification[], msg: string) {
    setNotifications(next);
    await write(next);
    setMessage(msg);
  }

  async function generate() {
    await saveAll([...suggested, ...notifications], `${suggested.length} automation notification(s) generated.`);
    setSuggested([]);
  }

  async function saveDraft() {
    if (!draft.recipient || !draft.message) return;
    const item = { ...draft, id: `manual-${Date.now()}`, createdAt: now() };
    await saveAll([item, ...notifications], 'Manual notification saved.');
    setDraft({ id: '', event: 'manual-message', orderNumber: '', recipient: '', channel: 'email', status: 'draft', subject: '', message: '', priority: 'normal', createdAt: now() });
  }

  return <div className="space-y-6">
    <PageHeader title="Customer Communication + Notification Automation" subtitle="Customer proof reminders, artwork alerts, production updates, staff escalations and webhook-ready communication logs." actions={<><Button onClick={load}>Refresh</Button><PrimaryButton onClick={generate} disabled={!suggested.length}>Generate automations</PrimaryButton></>} />
    {message ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}
    <div className="grid gap-4 md:grid-cols-5"><Stat icon={<Bell size={18}/>} label="Notifications" value={notifications.length}/><Stat icon={<Clock3 size={18}/>} label="Draft" value={notifications.filter((n) => n.status === 'draft').length}/><Stat icon={<CheckCircle2 size={18}/>} label="Sent" value={notifications.filter((n) => n.status === 'sent').length}/><Stat icon={<Mail size={18}/>} label="Email" value={notifications.filter((n) => n.channel === 'email').length}/><Stat icon={<MessageSquare size={18}/>} label="Suggested" value={suggested.length}/></div>
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]"><Card className="space-y-4"><h3 className="text-xl font-semibold text-white">Automation suggestions</h3><div className="space-y-3">{suggested.map((item) => <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{item.subject}</p><p className="mt-1 text-xs text-textMuted">{item.event} · {item.orderNumber} · {item.channel}</p></div><span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">suggested</span></div><p className="mt-3 text-sm text-textMuted">{item.message}</p></div>)}{!suggested.length ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">No new automation suggestions.</p> : null}</div></Card><Card className="space-y-3"><h3 className="font-semibold text-white">Manual communication</h3><Input placeholder="Order number" value={draft.orderNumber} onChange={(e) => setDraft({ ...draft, orderNumber: e.target.value })}/><Input placeholder="Recipient" value={draft.recipient} onChange={(e) => setDraft({ ...draft, recipient: e.target.value })}/><Select value={draft.channel} options={['email','sms','internal','webhook']} onChange={(e) => setDraft({ ...draft, channel: e.target.value })}/><Input placeholder="Subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })}/><textarea className="min-h-[130px] rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none" placeholder="Message" value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })}/><PrimaryButton onClick={saveDraft}>Save communication</PrimaryButton></Card></div>
    <Card className="space-y-4"><div className="grid gap-3 md:grid-cols-[1fr_180px_180px]"><Input placeholder="Search notifications..." value={query} onChange={(e) => setQuery(e.target.value)}/><Select value={channel} options={['all','email','sms','internal','webhook']} onChange={(e) => setChannel(e.target.value)}/><Select value={status} options={['all','draft','queued','sent','failed']} onChange={(e) => setStatus(e.target.value)}/></div><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.16em] text-textMuted"><tr><th className="py-2 pr-4">Event</th><th className="py-2 pr-4">Order</th><th className="py-2 pr-4">Recipient</th><th className="py-2 pr-4">Channel</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Subject</th><th className="py-2 pr-4">Actions</th></tr></thead><tbody className="divide-y divide-white/8">{filtered.map((item) => <tr key={item.id} className="text-textMuted"><td className="py-3 pr-4 text-white">{item.event}</td><td className="py-3 pr-4">{item.orderNumber || '—'}</td><td className="py-3 pr-4">{item.recipient}</td><td className="py-3 pr-4">{item.channel}</td><td className="py-3 pr-4">{item.status}</td><td className="py-3 pr-4">{item.subject}</td><td className="py-3 pr-4"><div className="flex gap-2"><Button onClick={() => saveAll(notifications.map((n) => n.id === item.id ? { ...n, status: 'queued' } : n), 'Notification queued.')}>Queue</Button><Button onClick={() => saveAll(notifications.map((n) => n.id === item.id ? { ...n, status: 'sent' } : n), 'Notification marked sent.')}><Send size={14}/></Button></div></td></tr>)}{!filtered.length ? <tr><td colSpan={7} className="py-5 text-textMuted">No notifications.</td></tr> : null}</tbody></table></div></Card>
  </div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <Card><div className="flex items-center gap-2 text-textMuted">{icon}<p className="text-xs uppercase">{label}</p></div><p className="mt-2 text-3xl font-semibold text-white">{value}</p></Card>;
}
