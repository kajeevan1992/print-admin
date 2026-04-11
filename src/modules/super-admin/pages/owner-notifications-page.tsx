
'use client';

import { useEffect, useMemo, useState } from 'react';
import { BellRing, Search, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerNotificationChannel, OwnerNotificationRecord, OwnerNotificationSeverity, OwnerNotificationStatus } from '@/data/owner-notifications';
import { ownerNotificationsService } from '@/services/owner-notifications.service';

type StatusFilter = 'all' | OwnerNotificationStatus;
type SeverityFilter = 'all' | OwnerNotificationSeverity;
type ChannelFilter = 'all' | OwnerNotificationChannel;

const severityTone: Record<OwnerNotificationSeverity, string> = {
  info: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
  watch: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/25 bg-rose-400/10 text-rose-200'
};

const emptyRecord: OwnerNotificationRecord = {
  id: '',
  title: '',
  audience: '',
  trigger: '',
  channel: 'email',
  severity: 'info',
  status: 'draft',
  message: '',
  updatedAt: '2026-04-11'
};

export function OwnerNotificationsPage() {
  const [rows, setRows] = useState<OwnerNotificationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [editing, setEditing] = useState<OwnerNotificationRecord | null>(null);

  async function load() {
    const data = await ownerNotificationsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.title, row.audience, row.trigger, row.message].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesSeverity = severity === 'all' || row.severity === severity;
    const matchesChannel = channel === 'all' || row.channel === channel;
    return matchesQuery && matchesStatus && matchesSeverity && matchesChannel;
  }), [rows, search, status, severity, channel]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerNotificationRecord) {
    await ownerNotificationsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Notifications"
        subtitle="Manage high-value owner-side alerts for billing, launches, deployments, and onboarding before wiring real delivery providers."
        actions={<><Button onClick={() => ownerNotificationsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `owner-note-${Date.now()}` })}>New Notification</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.5fr_repeat(3,180px)]">
        <Input id="owner-notifications-search" name="ownerNotificationsSearch" placeholder="Search title, audience, trigger, or message" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-notifications-status" name="ownerNotificationsStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }]} />
        <Select id="owner-notifications-severity" name="ownerNotificationsSeverity" value={severity} onChange={(e) => setSeverity(e.target.value as SeverityFilter)} options={[{ value: 'all', label: 'All severity' }, { value: 'info', label: 'Info' }, { value: 'watch', label: 'Watch' }, { value: 'critical', label: 'Critical' }]} />
        <Select id="owner-notifications-channel" name="ownerNotificationsChannel" value={channel} onChange={(e) => setChannel(e.target.value as ChannelFilter)} options={[{ value: 'all', label: 'All channels' }, { value: 'email', label: 'Email' }, { value: 'slack', label: 'Slack' }, { value: 'in-app', label: 'In-app' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner-side alert templates</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.title}</p>
                    <p className="text-xs text-textMuted">{row.audience} · {row.trigger} · {row.channel}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${severityTone[row.severity]}`}>{row.severity}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                  </div>
                </div>
                <p className="text-sm text-textMuted">{row.message}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No notification templates match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Template spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Audience" value={selected.audience} />
                <MiniStat label="Trigger" value={selected.trigger} />
                <MiniStat label="Channel" value={selected.channel} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Message</p>
                  <p className="mt-1 text-textMuted">{selected.message}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'active', updatedAt: '2026-04-11' })}>Activate</Button>
                  <Button onClick={() => save({ ...selected, status: 'paused', updatedAt: '2026-04-11' })}>Pause</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Notification</Button>
                  <Button onClick={async () => { await ownerNotificationsService.delete(selected.id); await load(); }}>Delete Notification</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a notification to review owner alerting behavior.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Keep owner notifications focused on high-value portfolio events so signal stays strong before real delivery providers are connected.</p>
              <p>This page is the right place later for provider wiring, delivery status, retries, and escalation routing.</p>
            </div>
          </Card>
        </div>
      </div>

      {editing && <EditModal value={editing} onClose={() => setEditing(null)} onSave={(next) => void save(next)} />}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
      <p className="text-xs uppercase tracking-[0.24em] text-textMuted">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}

function EditModal({ value, onClose, onSave }: { value: OwnerNotificationRecord; onClose: () => void; onSave: (value: OwnerNotificationRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerNotificationRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner notification' : 'New owner notification'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-notification-title" name="ownerNotificationTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <Input id="owner-notification-audience" name="ownerNotificationAudience" value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} placeholder="Audience" />
          <Input id="owner-notification-trigger" name="ownerNotificationTrigger" value={draft.trigger} onChange={(e) => setDraft({ ...draft, trigger: e.target.value })} placeholder="Trigger" />
          <Input id="owner-notification-updated" name="ownerNotificationUpdated" value={draft.updatedAt} onChange={(e) => setDraft({ ...draft, updatedAt: e.target.value })} placeholder="Updated at" />
          <Select id="owner-notification-channel" name="ownerNotificationChannel" value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value as OwnerNotificationChannel })} options={[{ value: 'email', label: 'Email' }, { value: 'slack', label: 'Slack' }, { value: 'in-app', label: 'In-app' }]} />
          <Select id="owner-notification-severity" name="ownerNotificationSeverity" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as OwnerNotificationSeverity })} options={[{ value: 'info', label: 'Info' }, { value: 'watch', label: 'Watch' }, { value: 'critical', label: 'Critical' }]} />
          <Select id="owner-notification-status" name="ownerNotificationStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerNotificationStatus })} options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }]} />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-notification-message"
            name="ownerNotificationMessage"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.message}
            onChange={(e) => setDraft({ ...draft, message: e.target.value })}
            placeholder="Message"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Notification</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
