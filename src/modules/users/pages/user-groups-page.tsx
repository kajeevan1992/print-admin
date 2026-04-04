'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import { usersService } from '@/services/users.service';
import type { UserGroup } from '@/modules/users/types';

export function UserGroupsPage() {
  const [items, setItems] = useState<UserGroup[]>([]);
  useEffect(() => { usersService.listUserGroups().then((res) => setItems(res.data.items)); }, []);
  return (
    <div>
      <PageHeader title="User Groups" subtitle="Manage storefront audience segmentation and catalog assignment groups." />
      <Card>
        <DataTable
          columns={[
            { key: 'name', header: 'Group', render: (row) => row.name },
            { key: 'description', header: 'Description', render: (row) => row.description },
            { key: 'usersCount', header: 'Users', render: (row) => String(row.usersCount) },
            { key: 'collectionsCount', header: 'Collections', render: (row) => String(row.collectionsCount) }
          ]}
          rows={items}
          rowKey={(row) => row.id}
        />
      </Card>
    </div>
  );
}
