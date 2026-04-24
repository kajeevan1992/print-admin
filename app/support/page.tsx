'use client';


export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { PrimaryButton } from '@/components/ui/buttons';
import { supportService } from '@/services/support.service';
import type { SupportTicket } from '@/data/support';

export default function Page() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');

  useEffect(() => { supportService.listTickets().then(setTickets); }, []);

  const filtered = useMemo(() => tickets.filter((ticket) => {
    const q = query.toLowerCase();
    const matchesQuery = !q || `${ticket.id} ${ticket.subject} ${ticket.customer} ${ticket.assignee}`.toLowerCase().includes(q);
    const matchesStatus = status === 'All' || ticket.status === status;
    return matchesQuery && matchesStatus;
  }), [tickets, query, status]);

  const openCount = tickets.filter((ticket) => ticket.status !== 'Resolved').length;
  const criticalCount = tickets.filter((ticket) => ticket.priority === 'Critical').length;

  return (
    <div className="space-y-4">
      <PageHeader title="Support" subtitle="Central workspace for queues, escalations, and response ownership." actions={<PrimaryButton>Create Support Task</PrimaryButton>} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-xs text-textMuted">Open Queue</p><p className="mt-2 text-2xl font-semibold">{openCount}</p></Card>
        <Card><p className="text-xs text-textMuted">Critical Tickets</p><p className="mt-2 text-2xl font-semibold">{criticalCount}</p></Card>
        <Card><p className="text-xs text-textMuted">Average First Response</p><p className="mt-2 text-2xl font-semibold">22m</p></Card>
      </div>
      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <Input placeholder="Search ticket, customer, assignee..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={status} options={['All', 'Open', 'In Progress', 'Waiting', 'Resolved']} onChange={(e) => setStatus(e.target.value)} />
        </div>
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div key={ticket.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{ticket.id} · {ticket.subject}</p>
                  <p className="text-sm text-textMuted">{ticket.customer} · Assigned to {ticket.assignee}</p>
                </div>
                <div className="text-right text-sm">
                  <p>{ticket.status} · {ticket.priority}</p>
                  <p className="text-textMuted">Updated {ticket.updatedAt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
