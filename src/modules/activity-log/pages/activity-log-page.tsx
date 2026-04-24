'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { reportsService } from '@/services/reports.service';

type ActivityItem = Awaited<ReturnType<typeof reportsService.getActivityLog>>[number];

const severityClasses: Record<ActivityItem['severity'], string> = {
  info: 'bg-panelMuted text-text',
  warning: 'bg-amber-500/15 text-amber-300',
  critical: 'bg-red-500/15 text-red-300'
};

export function ActivityLogPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('all');

  useEffect(() => {
    reportsService.getActivityLog().then(setItems);
  }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const byArea = area === 'all' || item.area === area;
    const haystack = `${item.actor} ${item.area} ${item.action} ${item.target}`.toLowerCase();
    const bySearch = !search.trim() || haystack.includes(search.toLowerCase());
    return byArea && bySearch;
  }), [items, search, area]);

  const areas = ['all', ...Array.from(new Set(items.map((item) => item.area)))];

  return (
    <div>
      <PageHeader title="Activity Log" subtitle="Track admin actions, system events, and operational alerts." />

      <div className="mb-4 grid gap-3 md:grid-cols-[2fr,1fr]">
        <Input placeholder="Search actor, action, target..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={areas} value={area} onChange={(e) => setArea(e.target.value)} />
      </div>

      <DataTable
        columns={[
          { key: 'timestamp', header: 'Timestamp', render: (row) => row.timestamp },
          { key: 'actor', header: 'Actor', render: (row) => row.actor },
          { key: 'area', header: 'Area', render: (row) => row.area },
          { key: 'action', header: 'Action', render: (row) => row.action },
          { key: 'target', header: 'Target', render: (row) => row.target },
          {
            key: 'severity',
            header: 'Severity',
            render: (row) => (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${severityClasses[row.severity]}`}>
                {row.severity}
              </span>
            )
          }
        ]}
        rows={filtered}
        rowKey={(row) => row.id}
      />
    </div>
  );
}