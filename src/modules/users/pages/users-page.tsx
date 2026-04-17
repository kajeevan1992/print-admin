'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { DataTable } from '@/components/data-table/data-table';
import { usersService } from '@/services/users.service';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import type { AdminUser, SiteUser, UserCart, UserGroup, UserProject, UserRole } from '@/modules/users/types';

export function UsersPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [siteUsers, setSiteUsers] = useState<SiteUser[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [carts, setCarts] = useState<UserCart[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [adminResponse, siteResponse, groupsResponse, rolesResponse, projectsResponse, cartsResponse] = await Promise.all([
        usersService.listAdminUsers(search || undefined),
        usersService.listSiteUsers(),
        usersService.listUserGroups(),
        usersService.listUserRoles(),
        usersService.listUserProjects(),
        usersService.listUserCarts()
      ]);
      setAdminUsers(adminResponse.data.items);
      setSiteUsers(siteResponse.data.items);
      setGroups(groupsResponse.data.items);
      setRoles(rolesResponse.data.items);
      setProjects(projectsResponse.data.items);
      setCarts(cartsResponse.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users module');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => ({
    adminUsers: adminUsers.length,
    storefrontUsers: siteUsers.length,
    groups: groups.length,
    activeCarts: carts.filter((item) => item.status === 'active').length
  }), [adminUsers.length, carts, groups.length, siteUsers.length]);

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage admin users, customer accounts, access groups, roles, projects, and carts from one workspace."
        actions={<><Button>Export</Button><PrimaryButton>Invite Admin User</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <MetricCard label="Admin Users" value={String(metrics.adminUsers)} />
        <MetricCard label="Site Users" value={String(metrics.storefrontUsers)} />
        <MetricCard label="User Groups" value={String(metrics.groups)} />
        <MetricCard label="Active Carts" value={String(metrics.activeCarts)} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Input placeholder="Search admin users by name, email, role, || department..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Card>
          <p className="text-xs uppercase tracking-wide text-textMuted">Quick access</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href="/site-users" className="rounded-lg border border-border px-3 py-2 hover:bg-panelMuted">Site Users</Link>
            <Link href="/user-groups" className="rounded-lg border border-border px-3 py-2 hover:bg-panelMuted">User Groups</Link>
            <Link href="/user-roles" className="rounded-lg border border-border px-3 py-2 hover:bg-panelMuted">User Roles</Link>
            <Link href="/user-projects" className="rounded-lg border border-border px-3 py-2 hover:bg-panelMuted">User Projects</Link>
            <Link href="/user-carts" className="rounded-lg border border-border px-3 py-2 hover:bg-panelMuted">User Carts</Link>
          </div>
        </Card>
      </div>

      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading users...</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div> : null}
      {!loading && !error && adminUsers.length === 0 ? <EmptyModuleState title="No admin users found" description="Try a different search || invite your first admin user." /> : null}

      {!loading && !error && adminUsers.length > 0 ? (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold">Admin Users</h3>
            <DataTable
              columns={[
                { key: 'user', header: 'User', render: (row) => <div><div className="font-medium">{row.name}</div><div className="text-xs text-textMuted">{row.email}</div></div> },
                { key: 'role', header: 'Role', render: (row) => <div><div>{row.roleName}</div><div className="text-xs text-textMuted">{row.department}</div></div> },
                { key: 'status', header: 'Status', render: (row) => <StatusPill value={row.status} /> },
                { key: 'lastLogin', header: 'Last Login', render: (row) => row.lastLogin },
                { key: 'action', header: 'Action', render: (row) => <Link href={`/users/${row.id}`} className="text-accent">Open</Link> }
              ]}
              rows={adminUsers}
              rowKey={(row) => row.id}
            />
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <SimpleTableCard
              title="User Groups"
              rows={groups}
              columns={[
                { key: 'name', header: 'Group', render: (row: UserGroup) => row.name },
                { key: 'users', header: 'Users', render: (row: UserGroup) => String(row.usersCount) },
                { key: 'collections', header: 'Collections', render: (row: UserGroup) => String(row.collectionsCount) }
              ]}
              rowKey={(row: UserGroup) => row.id}
            />
            <SimpleTableCard
              title="User Roles"
              rows={roles}
              columns={[
                { key: 'name', header: 'Role', render: (row: UserRole) => row.name },
                { key: 'desc', header: 'Description', render: (row: UserRole) => row.description },
                { key: 'members', header: 'Members', render: (row: UserRole) => String(row.membersCount) }
              ]}
              rowKey={(row: UserRole) => row.id}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SimpleTableCard
              title="User Projects"
              rows={projects}
              columns={[
                { key: 'name', header: 'Project', render: (row: UserProject) => row.name },
                { key: 'owner', header: 'Owner', render: (row: UserProject) => row.ownerName },
                { key: 'status', header: 'Status', render: (row: UserProject) => <StatusPill value={row.status} /> }
              ]}
              rowKey={(row: UserProject) => row.id}
            />
            <SimpleTableCard
              title="User Carts"
              rows={carts}
              columns={[
                { key: 'name', header: 'Customer', render: (row: UserCart) => row.customerName },
                { key: 'items', header: 'Items', render: (row: UserCart) => String(row.itemCount) },
                { key: 'status', header: 'Status', render: (row: UserCart) => <StatusPill value={row.status} /> }
              ]}
              rowKey={(row: UserCart) => row.id}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-textMuted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function StatusPill({ value }: { value: string }) {
  const tone = value.includes('active') || value.includes('ordered') || value.includes('converted')
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : value.includes('pending') || value.includes('review') || value.includes('invited')
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-red-500/30 bg-red-500/10 text-red-200';

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${tone}`}>{value.replace(/-/g, ' ')}</span>;
}

function SimpleTableCard<T>({
  title,
  rows,
  columns,
  rowKey
}: {
  title: string;
  rows: T[];
  columns: Array<{ key: string; header: string; render: (row: T) => React.ReactNode }>;
  rowKey: (row: T) => string;
}) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <DataTable columns={columns} rows={rows} rowKey={rowKey} />
    </Card>
  );
}
