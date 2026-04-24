'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table/data-table';
import { usersService } from '@/services/users.service';
import type { UserCart } from '@/modules/users/types';

export function UserCartsPage() {
  const [items, setItems] = useState<UserCart[]>([]);
  useEffect(() => { usersService.listUserCarts().then((res) => setItems(res.data.items)); }, []);
  return (
    <div>
      <PageHeader title="User Carts" subtitle="Monitor active, abandoned, and converted customer carts." />
      <Card>
        <DataTable
          columns={[
            { key: 'customerName', header: 'Customer', render: (row) => row.customerName },
            { key: 'itemCount', header: 'Items', render: (row) => String(row.itemCount) },
            { key: 'subtotal', header: 'Subtotal', render: (row) => `$${row.subtotal.toLocaleString()}` },
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
