'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useTenantTheme } from '@/providers/theme-provider';

const navItems = [
  { label: 'Home', href: '/storefront' },
  { label: 'Products', href: '/storefront/products' },
  { label: 'Templates', href: '/storefront/templates' },
  { label: 'Upload Artwork', href: '/storefront/upload-artwork' },
  { label: 'My Account', href: '/account-dashboard' }
];

export function PublicStorefrontLayout({
  children,
  announcement = 'Reusable storefront shell ready for customer-side frontend builds.'
}: {
  children: ReactNode;
  announcement?: string;
}) {
  const { config } = useTenantTheme();

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--theme-bg)',
        color: 'var(--theme-text)',
        fontFamily: 'var(--theme-font-sans)'
      }}
    >
      <div
        className="border-b px-4 py-2 text-center text-xs"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
      >
        {announcement}
      </div>

      <header
        className="sticky top-0 z-40 border-b backdrop-blur"
        style={{ borderColor: 'var(--theme-border)', background: 'color-mix(in srgb, var(--theme-surface) 92%, transparent)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/storefront" className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold"
              style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
            >
              PA
            </div>
            <div>
              <p className="text-sm font-semibold">{config.tenantName}</p>
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Storefront shell</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm transition hover:opacity-90"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/storefront/cart"
              className="rounded-full border px-4 py-2 text-sm"
              style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            >
              Cart
            </Link>
            <Link
              href="/storefront/products"
              className="rounded-full px-4 py-2 text-sm font-medium"
              style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
            >
              Shop now
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer
        className="mt-16 border-t"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-4">
          <div>
            <p className="text-sm font-semibold">About</p>
            <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              White-label storefront shell for print commerce, packaging, templates, and customer account flows.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Browse</p>
            <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              <p>Business cards</p>
              <p>Flyers</p>
              <p>Packaging</p>
              <p>Marketing materials</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">Customer tools</p>
            <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              <p>Saved projects</p>
              <p>Order tracking</p>
              <p>Approvals</p>
              <p>Upload artwork</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">Support</p>
            <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              <p>Help centre</p>
              <p>Templates</p>
              <p>Contact support</p>
              <p>Account services</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
