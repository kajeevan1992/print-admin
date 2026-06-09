'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, GitBranch, Link2, Search, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Suggestion = { label: string; href: string; targetPath: string; targetPageType: string; reason: string; score: number; relation: string };
type Row = {
  path: string;
  page: { title: string; pageType: string; status: string; h1: string; targetKeyword: string; productName?: string; locationName?: string };
  outboundLinks: Array<{ label: string; href: string }>;
  inboundLinks: Array<{ fromPath: string; label: string }>;
  outboundCount: number;
  inboundCount: number;
  isOrphan: boolean;
  missingOutboundLinks: boolean;
  suggestions: Suggestion[];
};
type Summary = { pages: number; orphanPages: number; missingOutboundLinks: number; suggestions: number; publishedPages: number; draftPages: number };

const pageTypes = ['all', 'home', 'product', 'category', 'location', 'collection-point', 'product-location', 'guide', 'static', 'service-area'];
const statuses = ['all', 'published', 'draft', 'hidden'];

export function SeoInternalLinkingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary>({ pages: 0, orphanPages: 0, missingOutboundLinks: 0, suggestions: 0, publishedPages: 0, draftPages: 0 });
  const [search, setSearch] = useState('');
  const [pageType, setPageType] = useState('all');
  const [status, setStatus] = useState('all');
  const [minScore, setMinScore] = useState('55');
  const [selectedPath, setSelectedPath] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ search, pageType, status, minScore, limit: '8' });
    const res = await fetch(`/api/internal/seo/internal-links?${params.toString()}`, { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal link suggestions failed to load.');
    setRows(payload.data?.rows || []);
    setSummary(payload.data?.summary || summary);
    setSelectedPath((current) => current || payload.data?.rows?.[0]?.path || '');
    setLoading(false);
  }

  async function apply(applyAll = false) {
    setBusy(true);
    const paths = Object.entries(checked).filter(([, value]) => value).map(([path]) => path);
    const selected = paths.length ? paths : selectedPath ? [selectedPath] : [];
    const res = await fetch('/api/internal/seo/internal-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'apply',
        apply: {
          applyAll,
          paths: selected,
          onlyMissing,
          maxPerPage: 4,
          minScore: Number(minScore || 55),
          status,
          pageType,
          search,
        },
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Applying internal links failed.');
    setMessage(`Applied suggestions to ${payload.data?.count || 0} SEO page(s).`);
    setChecked({});
    await load();
  }

  useEffect(() => { void load().catch((error) => { setMessage(error.message); setLoading(false); }); }, []);
  const selected = useMemo(() => rows.find((row) => row.path === selectedPath) || rows[0] || null, [rows, selectedPath]);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div>
      <PageHeader title="SEO Internal Linking" subtitle="Find orphan SEO pages, generate product/location/guide link suggestions and apply them to existing SEO Engine internalLinks." actions={<><Button onClick={() => void load()}>Refresh</Button><Button disabled={busy} onClick={() => void apply(false)}>{busy ? 'Applying...' : checkedCount ? `Apply selected (${checkedCount})` : 'Apply current page'}</Button><PrimaryButton disabled={busy} onClick={() => void apply(true)}>Apply all missing-link pages</PrimaryButton></>} />
      {message ? <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}

      <div className="mb-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Pages" value={summary.pages} />
        <Metric label="Orphan pages" value={summary.orphanPages} tone={summary.orphanPages ? 'amber' : 'green'} />
        <Metric label="Missing outbound" value={summary.missingOutboundLinks} tone={summary.missingOutboundLinks ? 'amber' : 'green'} />
        <Metric label="Suggestions" value={summary.suggestions} tone="blue" />
        <Metric label="Published" value={summary.publishedPages} />
        <Metric label="Draft" value={summary.draftPages} />
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_170px_170px_130px_auto]">
          <Input placeholder="Search path, keyword, product, location..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={pageType} onChange={(e) => setPageType(e.target.value)} options={pageTypes.map((value) => ({ value, label: value === 'all' ? 'All page types' : value }))} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={statuses.map((value) => ({ value, label: value === 'all' ? 'All statuses' : value }))} />
          <Input value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="Min score" />
          <Button onClick={() => void load()}><Search size={14} /> Apply</Button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />Only apply to pages with fewer than 3 outbound links</label>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm font-semibold text-white">Internal link opportunities</div>
          {loading ? <div className="p-6 text-sm text-textMuted">Loading suggestions...</div> : null}
          <div className="divide-y divide-white/6">
            {rows.map((row) => <button key={row.path} onClick={() => setSelectedPath(row.path)} className={`grid w-full gap-2 p-4 text-left hover:bg-white/[0.04] ${selectedPath === row.path ? 'bg-white/[0.06]' : ''}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={Boolean(checked[row.path])} onClick={(e) => e.stopPropagation()} onChange={(e) => setChecked((current) => ({ ...current, [row.path]: e.target.checked }))} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="break-words text-sm font-semibold text-white">{row.path}</p><p className="mt-1 text-xs text-textMuted">{row.page.pageType} · {row.page.status} · {row.page.targetKeyword || row.page.h1}</p></div><div className="flex flex-wrap gap-2"><Badge tone={row.isOrphan ? 'amber' : 'green'}>{row.isOrphan ? 'orphan' : `${row.inboundCount} inbound`}</Badge><Badge tone={row.missingOutboundLinks ? 'amber' : 'green'}>{row.outboundCount} outbound</Badge><Badge>{row.suggestions.length} suggestions</Badge></div></div>
                  {row.suggestions[0] ? <p className="mt-2 text-xs text-sky-100">Top suggestion: {row.suggestions[0].label} → {row.suggestions[0].href}</p> : <p className="mt-2 text-xs text-textMuted">No new suggestions at this score.</p>}
                </div>
              </div>
            </button>)}
            {!loading && !rows.length ? <div className="p-8 text-center text-sm text-textMuted">No SEO pages found for these filters.</div> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2"><GitBranch size={16} className="text-sky-300" /><h3 className="text-sm font-semibold text-white">Selected page</h3></div>
            {selected ? <div className="grid gap-3 text-sm"><Read label="Path" value={selected.path} /><div className="grid grid-cols-2 gap-3"><Mini label="Inbound" value={String(selected.inboundCount)} /><Mini label="Outbound" value={String(selected.outboundCount)} /></div>{selected.isOrphan ? <Notice tone="amber">This page is orphaned. No other SEO page currently links to it.</Notice> : <Notice tone="green">This page has inbound internal links.</Notice>}{selected.missingOutboundLinks ? <Notice tone="amber">This page has fewer than 3 outbound links.</Notice> : <Notice tone="green">This page has enough outbound links.</Notice>}</div> : <p className="text-sm text-textMuted">Select a page to review.</p>}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><Wand2 size={16} className="text-purple-300" /><h3 className="text-sm font-semibold text-white">Suggested links</h3></div>
            <div className="space-y-2">{selected?.suggestions?.map((item) => <div key={`${item.href}-${item.label}`} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-white">{item.label}</strong><Badge tone="blue">{item.score}</Badge></div><p className="mt-1 break-all text-sky-200">{item.href}</p><p className="mt-2 text-xs leading-5 text-textMuted">{item.reason}</p><p className="mt-1 text-xs text-textMuted">Relation: {item.relation} · Target: {item.targetPageType}</p></div>)}{selected && !selected.suggestions.length ? <Notice>No suggestions available for this page/filter.</Notice> : null}</div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><Link2 size={16} className="text-emerald-300" /><h3 className="text-sm font-semibold text-white">Current links</h3></div>
            <div className="space-y-2">{selected?.outboundLinks?.map((link) => <div key={`${link.href}-${link.label}`} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm"><strong className="text-white">{link.label}</strong><p className="mt-1 break-all text-sky-200">{link.href}</p></div>)}{selected && !selected.outboundLinks.length ? <Notice tone="amber">No current internal links on this SEO page.</Notice> : null}</div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-300" /><h3 className="text-sm font-semibold text-white">Rule</h3></div>
            <p className="text-sm leading-6 text-textMuted">This does not publish draft pages and does not create new pages. It only appends internal links to existing SEO Engine records. Review suggested links before bulk applying.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'green' | 'amber' | 'blue' }) {
  const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10' : '';
  return <Card className={cls}><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>;
}
function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'green' | 'amber' | 'blue' }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : tone === 'blue' ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-white/10 bg-white/[0.04] text-textMuted'; return <span className={`rounded-full border px-2.5 py-1 text-xs ${cls}`}>{children}</span>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>; }
function Read({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-1 break-words text-white">{value}</p></div>; }
function Notice({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'green' | 'amber' }) { const cls = tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-white/8 bg-white/[0.03] text-textMuted'; return <div className={`rounded-xl border p-3 text-sm leading-6 ${cls}`}>{children}</div>; }
