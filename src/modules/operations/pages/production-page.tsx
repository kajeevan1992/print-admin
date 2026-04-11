'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/card';
import { operationsService } from '@/services/operations.service';
import type { ProductionJob } from '@/data/operations';

const emptyJob: ProductionJob = { id: '', orderNumber: '', product: '', plant: 'Nevada DC', stage: 'queued', slaRisk: 'low', dueDate: '' };

export function ProductionPage() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [stage, setStage] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ProductionJob | null>(null);

  const load = async () => setJobs(await operationsService.getProductionJobs());
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => jobs.filter((job) => {
    const matchesSearch = !search || `${job.orderNumber} ${job.product} ${job.plant}`.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stage === 'all' || job.stage === stage;
    return matchesSearch && matchesStage;
  }), [jobs, search, stage]);

  return (
    <div className="space-y-4">
      <PageHeader title="Production" subtitle="Coordinate print production queues and plant operations." actions={<PrimaryButton onClick={() => setEditing({ ...emptyJob, id: `pj-${Date.now()}`, dueDate: new Date().toISOString().slice(0, 10) })}>Add Job</PrimaryButton>} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-xs text-textMuted">Queued</p><p className="mt-2 text-2xl font-semibold">{jobs.filter((item) => item.stage === 'queued').length}</p></Card>
        <Card><p className="text-xs text-textMuted">In production</p><p className="mt-2 text-2xl font-semibold">{jobs.filter((item) => item.stage === 'printing' || item.stage === 'finishing').length}</p></Card>
        <Card><p className="text-xs text-textMuted">High SLA risk</p><p className="mt-2 text-2xl font-semibold">{jobs.filter((item) => item.slaRisk === 'high').length}</p></Card>
        <Card><p className="text-xs text-textMuted">Plants</p><p className="mt-2 text-2xl font-semibold">{new Set(jobs.map((item) => item.plant)).size}</p></Card>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Search production jobs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={['all', 'queued', 'proofing', 'printing', 'finishing', 'shipped']} value={stage} onChange={(e) => setStage(e.target.value)} />
      </div>
      <DataTable
        columns={[
          { key: 'order', header: 'Order', render: (row) => row.orderNumber },
          { key: 'product', header: 'Product', render: (row) => row.product },
          { key: 'plant', header: 'Plant', render: (row) => row.plant },
          { key: 'stage', header: 'Stage', render: (row) => row.stage },
          { key: 'risk', header: 'SLA Risk', render: (row) => row.slaRisk },
          { key: 'dueDate', header: 'Due Date', render: (row) => row.dueDate },
          { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Button onClick={() => setEditing(row)}>Edit</Button><Button onClick={async () => { await operationsService.deleteProductionJob(row.id); await load(); }}>Delete</Button></div> }
        ]}
        rows={rows}
        rowKey={(row) => row.id}
      />

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Production Job' : 'Add Production Job'}>
        {editing ? (
          <div className="space-y-3">
            <Input placeholder="Order Number" value={editing.orderNumber} onChange={(e) => setEditing({ ...editing, orderNumber: e.target.value })} />
            <Input placeholder="Product" value={editing.product} onChange={(e) => setEditing({ ...editing, product: e.target.value })} />
            <Select options={['Nevada DC', 'Texas Plant', 'New Jersey Hub']} value={editing.plant} onChange={(e) => setEditing({ ...editing, plant: e.target.value })} />
            <Select options={['queued', 'proofing', 'printing', 'finishing', 'shipped']} value={editing.stage} onChange={(e) => setEditing({ ...editing, stage: e.target.value as ProductionJob['stage'] })} />
            <Select options={['low', 'medium', 'high']} value={editing.slaRisk} onChange={(e) => setEditing({ ...editing, slaRisk: e.target.value as ProductionJob['slaRisk'] })} />
            <Input type="date" value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} />
            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={async () => { await operationsService.saveProductionJob(editing); setEditing(null); await load(); }}>Save Job</PrimaryButton></div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
