'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { superAdminService } from '@/services/super-admin.service';
import type { DemoUploadRecord } from '@/data/super-admin';

type DemoStatus = DemoUploadRecord['status'] | 'all';

const emptyForm: DemoUploadRecord = {
  id: '',
  tenant: '',
  assetPack: '',
  status: 'draft',
  uploadedBy: 'Owner Ops',
  updatedAt: new Date().toISOString().slice(0, 10)
};

const tone: Record<DemoUploadRecord['status'], string> = {
  draft: 'border-white/8 bg-white/[0.03] text-text',
  uploaded: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
  approved: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
};

export function DemoLibraryPage() {
  const [items, setItems] = useState<DemoUploadRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DemoStatus>('all');
  const [editing, setEditing] = useState<DemoUploadRecord | null>(null);
  const [form, setForm] = useState<DemoUploadRecord>(emptyForm);

  async function load() {
    const rows = await superAdminService.listDemoUploads();
    setItems(rows);
    setSelectedId((current) => current ?? rows[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => items.filter((item) => {
    const haystack = `${item.tenant} ${item.assetPack} ${item.uploadedBy} ${item.status}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (status !== 'all' && item.status !== status) return false;
    return true;
  }), [items, search, status]);

  const selected = rows.find((item) => item.id === selectedId) ?? rows[0] ?? null;
  const counts = useMemo(() => ({ draft: rows.filter((i) => i.status === 'draft').length, uploaded: rows.filter((i) => i.status === 'uploaded').length, approved: rows.filter((i) => i.status === 'approved').length }), [rows]);

  function openCreate() {
    const next = { ...emptyForm, id: `demo-${Date.now()}` };
    setEditing(next);
    setForm(next);
  }
  function openEdit(record: DemoUploadRecord) { setEditing(record); setForm(record); }

  async function save() {
    await superAdminService.saveDemoUpload(form);
    setEditing(null);
    await load();
    setSelectedId(form.id);
  }

  async function updateRecord(record: DemoUploadRecord) {
    await superAdminService.saveDemoUpload(record);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Demo Library"
        subtitle="Manage demo packs, sample storefront assets, and approval flow for onboarding, sales demos, and trial launches."
        actions={<div className="flex flex-wrap gap-2"><Button onClick={() => void superAdminService.resetDemoUploads().then(load)}>Reset seed data</Button><PrimaryButton onClick={openCreate}>Add demo pack</PrimaryButton></div>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <MetricCard label="Draft" value={String(counts.draft)} />
        <MetricCard label="Uploaded" value={String(counts.uploaded)} />
        <MetricCard label="Approved" value={String(counts.approved)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenant, pack, || owner..." />
            <Select value={status} onChange={(e) => setStatus(e.target.value as DemoStatus)} options={[{ value: 'all', label: 'All status' }, { value: 'draft', label: 'Draft' }, { value: 'uploaded', label: 'Uploaded' }, { value: 'approved', label: 'Approved' }]} />
          </div>
          <div className="space-y-3">
            {rows.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === item.id ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] ${tone[item.status]}`}>{item.status}</span>
                    <p className="mt-3 text-lg font-semibold text-white">{item.assetPack}</p>
                    <p className="mt-1 text-sm text-textMuted">{item.tenant} · {item.uploadedBy}</p>
                  </div>
                  <Button onClick={(e) => { e.stopPropagation(); openEdit(item); }}>Edit</Button>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-textMuted">updated {item.updatedAt}</p>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Demo spotlight</p>
            {selected ? (
              <div className="mt-4 space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{selected.assetPack}</h2>
                  <p className="mt-2 text-sm text-textMuted">{selected.tenant} · {selected.uploadedBy} · {selected.updatedAt}</p>
                </div>
                <Info label="Status" value={selected.status} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => openEdit(selected)}>Edit</Button>
                  <Button onClick={() => void updateRecord({ ...selected, status: 'uploaded', updatedAt: new Date().toISOString().slice(0, 10) })}>Mark uploaded</Button>
                  <Button onClick={() => void updateRecord({ ...selected, status: 'approved', updatedAt: new Date().toISOString().slice(0, 10) })}>Approve</Button>
                  <Button onClick={() => void updateRecord({ ...selected, status: 'draft', updatedAt: new Date().toISOString().slice(0, 10) })}>Return draft</Button>
                  <Button onClick={() => void superAdminService.deleteDemoUpload(selected.id).then(load)}>Delete</Button>
                </div>
              </div>
            ) : <p className="mt-4 text-sm text-textMuted">Select a demo pack to inspect owner controls.</p>}
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Usage guidance</p>
            <ul className="mt-4 space-y-2 text-sm text-textMuted">
              <li>Use <span className="text-white">Draft</span> while building sample assets and storefront data.</li>
              <li>Use <span className="text-white">Uploaded</span> once the pack has been attached to a tenant || sales demo.</li>
              <li>Use <span className="text-white">Approved</span> when the pack is safe for reuse in onboarding.</li>
            </ul>
          </Card>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <Card className="w-full max-w-2xl space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Demo pack record</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Edit demo pack</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tenant"><Input value={form.tenant} onChange={(e) => setForm({ ...form, tenant: e.target.value })} /></Field>
              <Field label="Asset pack"><Input value={form.assetPack} onChange={(e) => setForm({ ...form, assetPack: e.target.value })} /></Field>
              <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DemoUploadRecord['status'] })} options={['draft', 'uploaded', 'approved']} /></Field>
              <Field label="Updated by"><Input value={form.uploadedBy} onChange={(e) => setForm({ ...form, uploadedBy: e.target.value })} /></Field>
              <Field label="Updated at"><Input type="date" value={form.updatedAt} onChange={(e) => setForm({ ...form, updatedAt: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={() => void save()}>Save demo pack</PrimaryButton></div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) { return <Card><p className="text-xs uppercase tracking-[0.2em] text-textMuted">{label}</p><p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p></Card>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3"><p className="text-[11px] uppercase tracking-[0.2em] text-textMuted">{label}</p><p className="mt-2 text-sm text-white">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2 text-sm text-textMuted"><span>{label}</span>{children}</label>; }
