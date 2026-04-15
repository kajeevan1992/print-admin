import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import { AppFrame } from '@/components/layout/app-frame';
import { ThemeProvider } from '@/providers/theme-provider';

export const metadata: Metadata = {
  title: 'Print Admin',
  description: 'Unified admin for print SaaS operations'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <AppFrame><ThemeProvider>{children}</ThemeProvider></AppFrame>
        </AuthProvider>
      </body>
    </html>
  );
}