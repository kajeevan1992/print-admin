'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/card';
import { operationsService } from '@/services/operations.service';
import type { GeneralSetting } from '@/data/operations';

export function SettingsPage() {
  const [settings, setSettings] = useState<GeneralSetting[]>([]);
  const [group, setGroup] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');

  const load = async () => setSettings(await operationsService.getGeneralSettings());
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => settings.filter((item) => group === 'all' || item.group === group), [settings, group]);

  return (
    <div className="space-y-4">
      <PageHeader title="General Settings" subtitle="Configure platform-level defaults and operational controls." />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-xs text-textMuted">Storefront</p><p className="mt-2 text-lg font-semibold">{settings.find((item) => item.key === 'storefrontName')?.value ?? '—'}</p></Card>
        <Card><p className="text-xs text-textMuted">Default currency</p><p className="mt-2 text-lg font-semibold">{settings.find((item) => item.key === 'defaultCurrency')?.value ?? '—'}</p></Card>
        <Card><p className="text-xs text-textMuted">Checkout mode</p><p className="mt-2 text-lg font-semibold">{settings.find((item) => item.key === 'checkoutMode')?.value ?? '—'}</p></Card>
        <Card><p className="text-xs text-textMuted">Support reply-to</p><p className="mt-2 text-lg font-semibold">{settings.find((item) => item.key === 'supportReplyTo')?.value ?? '—'}</p></Card>
      </div>
      <div className="flex gap-2">
        <Select options={['all', 'Storefront', 'Checkout', 'Notifications', 'Localization']} value={group} onChange={(e) => setGroup(e.target.value)} />
      </div>
      <DataTable
        columns={[
          { key: 'group', header: 'Group', render: (row) => row.group },
          { key: 'label', header: 'Setting', render: (row) => row.label },
          { key: 'value', header: 'Value', render: (row) => editingId === row.id ? <Input value={draftValue} onChange={(e) => setDraftValue(e.target.value)} /> : row.value },
          { key: 'actions', header: 'Actions', render: (row) => editingId === row.id ? <div className="flex gap-2"><PrimaryButton onClick={async () => { await operationsService.saveGeneralSetting({ ...row, value: draftValue }); setEditingId(null); await load(); }}>Save</PrimaryButton><Button onClick={() => setEditingId(null)}>Cancel</Button></div> : <Button onClick={() => { setEditingId(row.id); setDraftValue(row.value); }}>Edit</Button> }
        ]}
        rows={rows}
        rowKey={(row) => row.id}
      />
    </div>
  );
}
