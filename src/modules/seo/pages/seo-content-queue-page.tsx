'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Search, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type QueueStatus = 'open' | 'in_progress' | 'done' | 'snoozed';
type Task = {
  id: string;
  path: string;
  title: string;
  pageType: string;
  status: QueueStatus;
  pageStatus: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  type: string;
  reason: string;
  action: string;
  score: number;
  impact: number;
  effort: number;
  metric: { impressions: number; clicks: number; ctr: number; position: number; gaSessions: number; gaConversions: number; source: string; topQueries?: Array<{ query: string; clicks: number; impressions: number; position: number }> };
  pageScore: number;
  readabilityScore: number;
  warnings: string[];
  errors: string[];
  suggestions: { title?: string; metaDescription?: string; h1?: string; introCopy?: string; internalLinks?: Array<{ label: string; href: string }> };
};
type Summary = { tasks: number; urgent: number; high: number; medium: number; low: number; open: number; inProgress: number; done: number; pages: number };

const pageTypes = ['all', 'home', 'product', 'category', 'location', 'collection-point', 'product-location', 'guide', 'static', 'service-area'];
const statuses = ['all', 'published', 'draft', 'hidden'];
const taskStatuses = ['all', 'open', 'in_progress', 'done', 'snoozed'];
const priorities = ['all', 'urgent', 'high', 'medium', 'low'];
const types = ['all', 'seo-error', 'missing-meta', 'thin-content', 'low-readability', 'low-ctr', 'page-two', 'no-impressions', 'no-internal-links', 'no-conversions', 'monitor'];
const sources = ['all', 'gsc', 'ga4', 'mixed', 'manual', 'estimate'];

function percent(value: number) { return `${Math.round(Number(value || 0) * 10000) / 100}%`; }
function num(value: number) { return new Intl.NumberFormat('en-GB').format(Number(value || 0)); }
function label(value: string) { return value === 'all' ? 'All' : value.replace(/-/g, ' ').replace(/_/g, ' '); }

export function SeoContentQueuePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<Summary>({ tasks: 0, urgent: 0, high: 0, medium: 0, low: 0, open: 0, inProgress: 0, done: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [pageType, setPageType] = useState('all');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [taskStatus, setTaskStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [type, setType] = useState('all');
  const [hideDone, setHideDone] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ search, pageType, status, source, taskStatus, priority, type, hideDone: String(hideDone) });
    const res = await fetch(`/api/internal/seo/content-queue?${params.toString()}`, { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'SEO content queue failed to load.');
    setTasks(payload.data?.tasks || []);
    setSummary(payload.data?.summary || summary);
    setSelectedId((current) => current || payload.data?.tasks?.[0]?.id || '');
    setLoading(false);
  }

  async function post(action: string, task: Partial<Task> & { status?: QueueStatus }) {
    setBusy(true);
    const res = await fetch('/api/internal/seo/content-queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, task }) });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'SEO content queue action failed.');
    setMessage(action === 'quick-fix' ? 'Quick fix applied to the SEO page.' : `Task updated to ${task.status}.`);
    await load();
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);
  const selected = useMemo(() => tasks.find((task) => task.id === selectedId) || tasks[0] || null, [tasks, selectedId]);

  return (
    <div>
      <PageHeader title="SEO Content Improvement Queue" subtitle="A daily SEO task queue based on SEO Engine audits, Search Console metrics and GA4 behaviour data." actions={<><Button onClick={() => void load()}>Refresh</Button>{selected ? <Button disabled={busy} onClick={() => void post('status', { path: selected.path, type: selected.type, status: 'in_progress' })}>Start selected</Button> : null}{selected ? <PrimaryButton disabled={busy} onClick={() => void post('quick-fix', { path: selected.path, type: selected.type, status: 'in_progress' })}>Apply quick fix</PrimaryButton> : null}</>} />
      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <Metric label="Tasks" value={summary.tasks} />
        <Metric label="Urgent" value={summary.urgent} tone={summary.urgent ? 'red' : 'green'} />
        <Metric label="High" value={summary.high} tone={summary.high ? 'amber' : 'green'} />
        <Metric label="Medium" value={summary.medium} />
        <Metric label="Open" value={summary.open} tone={summary.open ? 'blue' : 'green'} />
        <Metric label="In progress" value={summary.inProgress} />
        <Metric label="Done" value={summary.done} tone="green" />
        <Metric label="Pages" value={summary.pages} />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_145px_135px_125px_135px_135px_155px_auto]">
          <Input placeholder="Search path, title, keyword..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={pageType} onChange={(e) => setPageType(e.target.value)} options={pageTypes.map((value) => ({ value, label: label(value) }))} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={statuses.map((value) => ({ value, label: label(value) }))} />
          <Select value={source} onChange={(e) => setSource(e.target.value)} options={sources.map((value) => ({ value, label: label(value) }))} />
          <Select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)} options={taskStatuses.map((value) => ({ value, label: label(value) }))} />
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} options={priorities.map((value) => ({ value, label: label(value) }))} />
          <Select value={type} onChange={(e) => setType(e.target.value)} options={types.map((value) => ({ value, label: label(value) }))} />
          <Button onClick={() => void load()}><Search size={14} /> Apply</Button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />Hide done tasks</label>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Priority queue</div>
          {loading ? <div className="p-6 text-sm text-textMuted">Loading content queue...</div> : null}
          <div className="divide-y divide-white/6">
            {tasks.map((task) => <button key={task.id} onClick={() => setSelectedId(task.id)} className={`grid w-full gap-2 p-4 text-left hover:bg-white/[0.04] ${selectedId === task.id ? 'bg-white/[0.06]' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge tone={priorityTone(task.priority)}>{task.priority}</Badge><Badge>{label(task.type)}</Badge><Badge tone={statusTone(task.status)}>{label(task.status)}</Badge></div><p className="mt-2 break-words text-sm font-semibold text-white">{task.path}</p><p className="mt-1 text-xs text-textMuted">{task.pageType} · {task.pageStatus} · source {task.metric.source}</p></div><div className="text-right text-xs text-textMuted"><div>Impact {task.impact}</div><div>Effort {task.effort}</div><div>Score {task.score}</div></div></div>
              <p className="text-sm leading-6 text-textMuted">{task.reason}</p>
              <div className="grid gap-2 text-xs text-textMuted md:grid-cols-4"><span>Clicks {num(task.metric.clicks)}</span><span>Impr. {num(task.metric.impressions)}</span><span>CTR {percent(task.metric.ctr)}</span><span>Pos. {task.metric.position || '-'}</span></div>
            </button>)}
            {!loading && !tasks.length ? <div className="p-8 text-center text-sm text-textMuted">No content tasks found for this filter.</div> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2"><FileText size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Selected task</h3></div>
            {selected ? <div className="grid gap-3 text-sm"><Read label="Path" value={selected.path} /><Read label="Reason" value={selected.reason} /><Read label="Recommended action" value={selected.action} /><div className="grid grid-cols-2 gap-3"><Mini label="Page score" value={String(selected.pageScore)} /><Mini label="Readability" value={String(selected.readabilityScore)} /></div><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void post('status', { path: selected.path, type: selected.type, status: 'open' })}>Open</Button><Button disabled={busy} onClick={() => void post('status', { path: selected.path, type: selected.type, status: 'in_progress' })}>In progress</Button><Button disabled={busy} onClick={() => void post('status', { path: selected.path, type: selected.type, status: 'snoozed' })}>Snooze</Button><PrimaryButton disabled={busy} onClick={() => void post('status', { path: selected.path, type: selected.type, status: 'done' })}>Mark done</PrimaryButton></div></div> : <p className="text-sm text-textMuted">Select a task to review.</p>}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><Wand2 size={16} className="text-purple-300" /><h3 className="text-sm font-semibold text-white">Quick-fix preview</h3></div>
            {selected ? <div className="grid gap-3 text-sm"><Preview label="SEO title" value={selected.suggestions.title || ''} /><Preview label="Meta description" value={selected.suggestions.metaDescription || ''} /><Preview label="H1" value={selected.suggestions.h1 || ''} /><Preview label="Intro copy" value={selected.suggestions.introCopy || ''} />{selected.suggestions.internalLinks?.length ? <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">Suggested links</p>{selected.suggestions.internalLinks.map((link) => <p key={link.href} className="mt-1 break-all text-sky-200">{link.label} → {link.href}</p>)}</div> : null}<PrimaryButton disabled={busy} onClick={() => void post('quick-fix', { path: selected.path, type: selected.type, status: 'in_progress' })}>Apply quick fix</PrimaryButton></div> : <p className="text-sm text-textMuted">Select a task to see suggestions.</p>}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-300" /><h3 className="text-sm font-semibold text-white">Warnings / errors</h3></div>
            {selected ? <div className="space-y-2">{[...selected.errors, ...selected.warnings].slice(0, 10).map((item) => <Notice key={item} tone={selected.errors.includes(item) ? 'red' : 'amber'}>{item}</Notice>)}{!selected.errors.length && !selected.warnings.length ? <Notice tone="green"><CheckCircle2 className="mr-2 inline h-4 w-4" />No audit warnings on this task.</Notice> : null}</div> : null}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><ExternalLink size={16} className="text-emerald-300" /><h3 className="text-sm font-semibold text-white">Where to finish manually</h3></div>
            <p className="text-sm leading-6 text-textMuted">Quick fix is safe and basic. For final copy, open SEO Engine, review the page, improve the wording properly, then mark this task done.</p>
            <div className="mt-3 flex flex-wrap gap-2"><a className="rounded-full border border-white/10 px-3 py-2 text-xs text-sky-200" href="/seo-engine">Open SEO Engine</a><a className="rounded-full border border-white/10 px-3 py-2 text-xs text-sky-200" href="/seo-analytics">Open SEO Analytics</a><a className="rounded-full border border-white/10 px-3 py-2 text-xs text-sky-200" href="/seo-internal-links">Open Internal Linking</a></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function priorityTone(priority: string) { return priority === 'urgent' ? 'red' : priority === 'high' ? 'amber' : priority === 'medium' ? 'blue' : 'green'; }
function statusTone(status: string) { return status === 'done' ? 'green' : status === 'in_progress' ? 'blue' : status === 'snoozed' ? 'amber' : 'default'; }
function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'red' ? 'border-red-500/30 bg-red-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : ''; return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : tone === 'red' ? 'border-red-500/30 bg-red-500/10 text-red-100' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-white/10 bg-white/[0.04] text-textMuted'; return <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${cls}`}>{children}</span>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>; }
function Read({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-white">{value}</p></div>; }
function Preview({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 whitespace-pre-wrap text-white">{value || 'No suggestion.'}</p></div>; }
function Notice({ children, tone = 'default' }: { children: ReactNode; tone?: string }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : tone === 'red' ? 'border-red-500/30 bg-red-500/10 text-red-100' : 'border-white/8 bg-white/[0.03] text-textMuted'; return <div className={`rounded-xl border p-3 text-sm leading-6 ${cls}`}>{children}</div>; }
