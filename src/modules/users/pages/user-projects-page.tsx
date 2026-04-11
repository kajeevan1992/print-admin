'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import { usersService } from '@/services/users.service';
import type { UserProject } from '@/modules/users/types';

export function UserProjectsPage() {
  const [items, setItems] = useState<UserProject[]>([]);
  useEffect(() => { usersService.listUserProjects().then((res) => setItems(res.data.items)); }, []);
  return (
    <div>
      <PageHeader title="User Projects" subtitle="Track customer design projects before they convert into production orders." />
      <Card>
        <DataTable
          columns={[
            { key: 'name', header: 'Project', render: (row) => row.name },
            { key: 'owner', header: 'Owner', render: (row) => row.ownerName },
            { key: 'product', header: 'Product', render: (row) => row.productName },
            { key: 'status', header: 'Status', render: (row) => row.status },
            { key: 'updatedAt', header: 'Updated', render: (row) => row.updatedAt }
          ]}
          rows={items}
          rowKey={(row) => row.id}
        />
      </Card>
    </div>
  );
}
