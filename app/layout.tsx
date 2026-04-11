import './globals.css';
import { AdminShell } from '@/components/layout/admin-shell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Print Admin',
  description: 'Unified admin for print SaaS operations'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
