'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import { usersService } from '@/services/users.service';
import type { UserRole } from '@/modules/users/types';

export function UserRolesPage() {
  const [items, setItems] = useState<UserRole[]>([]);
  useEffect(() => { usersService.listUserRoles().then((res) => setItems(res.data.items)); }, []);
  return (
    <div>
      <PageHeader title="User Roles" subtitle="Define admin permissions and role-based access across the control center." />
      <Card>
        <DataTable
          columns={[
            { key: 'name', header: 'Role', render: (row) => row.name },
            { key: 'description', header: 'Description', render: (row) => row.description },
            { key: 'membersCount', header: 'Members', render: (row) => String(row.membersCount) }
          ]}
          rows={items}
          rowKey={(row) => row.id}
        />
      </Card>
    </div>
  );
}
