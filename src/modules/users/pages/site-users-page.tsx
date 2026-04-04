'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import { usersService } from '@/services/users.service';
import type { SiteUser } from '@/modules/users/types';

export function SiteUsersPage() {
  const [items, setItems] = useState<SiteUser[]>([]);
  useEffect(() => { usersService.listSiteUsers().then((res) => setItems(res.data.items)); }, []);
  return (
    <div>
      <PageHeader title="Site Users" subtitle="Customer-facing accounts across organizations and storefronts." />
      <Card>
        <DataTable
          columns={[
            { key: 'name', header: 'User', render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-textMuted">{row.email}</div></div> },
            { key: 'org', header: 'Organization', render: (row) => row.organization },
            { key: 'group', header: 'Group', render: (row) => row.groupName },
            { key: 'orders', header: 'Orders', render: (row) => String(row.ordersCount) },
            { key: 'ltv', header: 'Lifetime Value', render: (row) => `$${row.lifetimeValue.toLocaleString()}` }
          ]}
          rows={items}
          rowKey={(row) => row.id}
        />
      </Card>
    </div>
  );
}
