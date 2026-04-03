'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { DataTable } from '@/components/data-table/data-table';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import { channelsService } from '@/services/channels.service';
import { themesService } from '@/services/themes.service';
import { ChannelFormModal } from '@/modules/channels/components/channel-form-modal';
import type { Channel, ChannelForm } from '@/modules/channels/types';

const emptyChannel: ChannelForm = { name: '', slug: '', domain: '', status: 'active', themeId: '', currency: 'USD', locale: 'en-US', isHeadless: false };

export function ChannelsListPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [themes, setThemes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ChannelForm>(emptyChannel);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [channelsResponse, themesResponse] = await Promise.all([
        channelsService.listChannels({ search: search || undefined, status: status === 'all' ? undefined : status }),
        themesService.listThemes()
      ]);
      setChannels(channelsResponse.data.items);
      const map = Object.fromEntries(themesResponse.data.items.map((theme) => [theme.id, theme.name]));
      setThemes(map);
      setForm((prev) => ({ ...prev, themeId: themesResponse.data.items[0]?.id ?? '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, status]);

  return (
    <div>
      <PageHeader title="Channels" subtitle="Manage storefront channels, domains, and frontend delivery modes." actions={<PrimaryButton onClick={() => setOpen(true)}>+ Create Channel</PrimaryButton>} />
      <div className="mb-4 flex gap-2">
        <Input placeholder="Search channels..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={['all', 'active', 'inactive']} value={status} onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'inactive')} />
      </div>

      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading channels...</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div> : null}

      {!loading && !error && channels.length === 0 ? <EmptyModuleState title="No channels yet" description="Create your first storefront channel to start assigning themes and products." /> : null}

      {!loading && !error && channels.length > 0 ? (
        <DataTable
          columns={[
            { key: 'name', header: 'Name', render: (row) => row.name },
            { key: 'domain', header: 'Domain', render: (row) => row.domain || '—' },
            { key: 'status', header: 'Status', render: (row) => row.status },
            { key: 'theme', header: 'Theme', render: (row) => themes[row.themeId] ?? row.themeId },
            { key: 'type', header: 'Type', render: (row) => (row.isHeadless ? 'Headless' : 'Hosted') },
            { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Link href={`/channels/${row.id}`} className="text-accent">Open</Link><Button>Edit</Button></div> }
          ]}
          rows={channels}
          rowKey={(row) => row.id}
        />
      ) : null}

      <ChannelFormModal
        open={open}
        value={form}
        themeOptions={Object.keys(themes)}
        onChange={(changes) => setForm((prev) => ({ ...prev, ...changes }))}
        onClose={() => setOpen(false)}
        onSubmit={async () => {
          await channelsService.createChannel(form);
          setOpen(false);
          setForm(emptyChannel);
          await load();
        }}
      />
    </div>
  );
}
