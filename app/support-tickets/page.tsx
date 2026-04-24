'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { PrimaryButton, Button } from '@/components/ui/buttons';
import { supportService } from '@/services/support.service';
import type { SupportTicket } from '@/data/support';

const seedDraft = {
  subject: '',
  customer: '',
  assignee: 'Unassigned',
  priority: 'Medium' as SupportTicket['priority'],
  status: 'Open' as SupportTicket['status']
};

const statusOrder: SupportTicket['status'][] = ['Open', 'In Progress', 'Waiting', 'Resolved'];
const priorities: SupportTicket['priority'][] = ['Low', 'Medium', 'High', 'Critical'];

function badgeClass(value: string) {
  if (value === 'Critical' || value === 'Open') return 'border-rose-500/20 bg-rose-500/10 text-rose-200';
  if (value === 'High' || value === 'In Progress') return 'border-amber-500/20 bg-amber-500/10 text-amber-200';
  if (value === 'Resolved') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
  return 'border-white/10 bg-white/[0.04] text-textMuted';
}

export default function Page() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | SupportTicket['status']>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | SupportTicket['priority']>('All');
  const [draft, setDraft] = useState(seedDraft);
  const [activeId, setActiveId] = useState<string>('');

  const load = async () => {
    const next = await supportService.listTickets();
    setTickets(next);
    if (!activeId && next[0]) setActiveId(next[0].id);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesText = !text || [ticket.id, ticket.subject, ticket.customer, ticket.assignee].join(' ').toLowerCase().includes(text);
      const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || ticket.priority === priorityFilter;
      return matchesText && matchesStatus && matchesPriority;
    });
  }, [tickets, query, statusFilter, priorityFilter]);

  const activeTicket = filtered.find((ticket) => ticket.id === activeId) ?? filtered[0] ?? tickets[0];

  useEffect(() => {
    if (activeTicket && activeTicket.id !== activeId) setActiveId(activeTicket.id);
  }, [activeTicket, activeId]);

  const stats = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status !== 'Resolved').length;
    const critical = tickets.filter((ticket) => ticket.priority === 'Critical').length;
    const waiting = tickets.filter((ticket) => ticket.status === 'Waiting').length;
    return [
      { label: 'Open workload', value: open, note: 'Tickets still active' },
      { label: 'Critical cases', value: critical, note: 'Needs same-day action' },
      { label: 'Waiting on customer', value: waiting, note: 'Follow-up queue' }
    ];
  }, [tickets]);

  async function createTicket() {
    if (!draft.subject.trim() || !draft.customer.trim()) return;
    const created = await supportService.addTicket({
      subject: draft.subject.trim(),
      customer: draft.customer.trim(),
      assignee: draft.assignee.trim() || 'Unassigned',
      priority: draft.priority,
      status: draft.status
    });
    setDraft(seedDraft);
    await load();
    setActiveId(created.id);
  }

  async function cycleStatus(ticket: SupportTicket) {
    const next = statusOrder[(statusOrder.indexOf(ticket.status) + 1) % statusOrder.length];
    await supportService.updateTicket(ticket.id, { status: next });
    await load();
  }

  async function escalate(ticket: SupportTicket) {
    const next = priorities[Math.min(priorities.indexOf(ticket.priority) + 1, priorities.length - 1)];
    await supportService.updateTicket(ticket.id, { priority: next, status: ticket.status === 'Resolved' ? 'Resolved' : 'In Progress' });
    await load();
  }

  async function resolve(ticket: SupportTicket) {
    await supportService.updateTicket(ticket.id, { status: 'Resolved' });
    await load();
  }

  async function remove(ticket: SupportTicket) {
    await supportService.deleteTicket(ticket.id);
    await load();
  }

  async function reset() {
    await supportService.resetTickets();
    setQuery('');
    setStatusFilter('All');
    setPriorityFilter('All');
    await load();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Support Hub"
        subtitle="Run internal helpdesk, escalations, and commercial support from one queue."
        actions={<div className="flex gap-2"><Button onClick={reset}>Reset</Button><PrimaryButton onClick={createTicket}>Create ticket</PrimaryButton></div>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">{stat.label}</p>
            <p className="text-3xl font-semibold text-text">{stat.value}</p>
            <p className="text-sm text-textMuted">{stat.note}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Search subject, customer, assignee" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | SupportTicket['status'])}>
              <option>All</option>
              {statusOrder.map((status) => <option key={status}>{status}</option>)}
            </select>
            <select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'All' | SupportTicket['priority'])}>
              <option>All</option>
              {priorities.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-textMuted">{filtered.length} visible tickets</div>
          </div>

          <div className="space-y-3">
            {filtered.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setActiveId(ticket.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${activeTicket?.id === ticket.id ? 'border-accent/40 bg-accent/10' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">{ticket.id} · {ticket.subject}</p>
                    <p className="mt-1 text-sm text-textMuted">{ticket.customer} · {ticket.assignee}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${badgeClass(ticket.priority)}`}>{ticket.priority}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${badgeClass(ticket.status)}`}>{ticket.status}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-textMuted">Updated {ticket.updatedAt}</p>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Quick create</p>
            <Input placeholder="Subject" value={draft.subject} onChange={(e) => setDraft((current) => ({ ...current, subject: e.target.value }))} />
            <Input placeholder="Customer / requester" value={draft.customer} onChange={(e) => setDraft((current) => ({ ...current, customer: e.target.value }))} />
            <Input placeholder="Assignee" value={draft.assignee} onChange={(e) => setDraft((current) => ({ ...current, assignee: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={draft.priority} onChange={(e) => setDraft((current) => ({ ...current, priority: e.target.value as SupportTicket['priority'] }))}>
                {priorities.map((priority) => <option key={priority}>{priority}</option>)}
              </select>
              <select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text outline-none" value={draft.status} onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value as SupportTicket['status'] }))}>
                {statusOrder.map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
            <PrimaryButton onClick={createTicket}>Add support case</PrimaryButton>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Ticket spotlight</p>
                <p className="mt-1 text-lg font-semibold text-text">{activeTicket ? activeTicket.subject : 'No ticket selected'}</p>
              </div>
              {activeTicket ? <span className={`rounded-full border px-2.5 py-1 text-xs ${badgeClass(activeTicket.priority)}`}>{activeTicket.priority}</span> : null}
            </div>
            {activeTicket ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Customer</p>
                    <p className="mt-2 text-sm font-medium text-text">{activeTicket.customer}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Assignee</p>
                    <p className="mt-2 text-sm font-medium text-text">{activeTicket.assignee}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Status</p>
                    <p className="mt-2 text-sm font-medium text-text">{activeTicket.status}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Last touched</p>
                    <p className="mt-2 text-sm font-medium text-text">{activeTicket.updatedAt}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => cycleStatus(activeTicket)}>Advance status</Button>
                  <Button onClick={() => escalate(activeTicket)}>Escalate</Button>
                  <Button onClick={() => resolve(activeTicket)}>Resolve</Button>
                  <Button onClick={() => remove(activeTicket)} className="text-rose-200">Delete</Button>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-textMuted">
                  Use this page as the operational support queue before wiring real messaging, SLA timers, and account activity history.
                </div>
              </>
            ) : (
              <p className="text-sm text-textMuted">Select a ticket from the queue to review and take action.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
