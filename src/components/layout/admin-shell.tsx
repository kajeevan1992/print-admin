import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { PageContainer } from './page-container';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="w-full p-4 sm:p-6">
        <PageContainer>
          <Topbar />
          {children}
        </PageContainer>
      </main>
    </div>
  );
}
