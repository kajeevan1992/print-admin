'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';
import { usersService } from '@/services/users.service';
import type { AdminUser } from '@/modules/users/types';

export function UserDetailPage({ id }: { id: string }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    usersService
      .getAdminUser(id)
      .then((response) => setUser(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load user'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Card>Loading user...</Card>;
  if (error) return <Card className="text-red-300">{error}</Card>;
  if (!user) return <Card>User not found.</Card>;

  return (
    <div>
      <PageHeader title={user.name} subtitle={`${user.roleName} · ${user.department}`} actions={<><Button>Reset Password</Button><Button>Suspend</Button></>} />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-textMuted">Profile</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-panelMuted text-lg font-semibold">{user.avatar}</div>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-textMuted">{user.email}</div>
            </div>
          </div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-textMuted">Access</p>
          <p className="mt-2 text-sm">Role: {user.roleName}</p>
          <p className="mt-1 text-sm">Department: {user.department}</p>
          <p className="mt-1 text-sm capitalize">Status: {user.status}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-textMuted">Recent Activity</p>
          <p className="mt-2 text-sm">Last Login: {user.lastLogin}</p>
          <p className="mt-1 text-sm text-textMuted">Audit trail, permission changes, and store access history can be added in the next build.</p>
        </Card>
      </div>
    </div>
  );
}
