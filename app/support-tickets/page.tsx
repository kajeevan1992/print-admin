'use client';


export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { PrimaryButton } from '@/components/ui/buttons';
import { supportService } from '@/services/support.service';
import type { SupportTicket } from '@/data/support';

export default function Page() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState('');

  const load = async () => setTickets(await supportService.listTickets());
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Support Tickets" subtitle="Review internal support cases, escalations, and resolution notes." actions={<PrimaryButton onClick={async () => { if (!subject.trim()) return; await supportService.addTicket({ subject, customer: 'Internal Request', priority: 'Medium', status: 'Open', assignee: 'Unassigned' }); setSubject(''); await load(); }}>New Ticket</PrimaryButton>} />
      <Card>
        <div className="mb-4"><Input placeholder="Quick add ticket subject..." value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <div className="space-y-3">
          {tickets.map((ticket) => <div key={ticket.id} className="rounded-xl border border-border p-4"><p className="font-semibold">{ticket.id} · {ticket.subject}</p><p className="text-sm text-textMuted">{ticket.customer} · {ticket.status} · {ticket.priority}</p></div>)}
        </div>
      </Card>
    </div>
  );
}
