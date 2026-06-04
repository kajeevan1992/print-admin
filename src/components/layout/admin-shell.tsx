import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { PageContainer } from './page-container';
import { OwnerPersistenceRouteBanner } from '@/modules/super-admin/components/owner-persistence-route-banner';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="w-full p-4 sm:p-6">
        <PageContainer>
          <Topbar />
          <OwnerPersistenceRouteBanner />
          {children}
        </PageContainer>
      </main>
    </div>
  );
}
