import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track your order',
  description: '',
  referrer: 'no-referrer',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
