'use client';

import Link from 'next/link';
import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';

export default function Page() {
  return (
    <PublicStorefrontLayout>
      <StorefrontSection
        eyebrow="v114 shell"
        title="Upload Artwork"
        body="Starter shell for artwork uploads, file checks, and print-ready flows."
      >
        <div className="rounded-[2rem] border p-6" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            This route is now part of the reusable storefront framework and will be expanded in the next focused builds.
          </p>
          <div className="mt-5 flex gap-3">
            <Link
              href="/storefront"
              className="rounded-full border px-4 py-2 text-sm"
              style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            >
              Back to storefront
            </Link>
            <Link
              href="/frontend-foundation"
              className="rounded-full px-4 py-2 text-sm font-medium"
              style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
            >
              Theme engine
            </Link>
          </div>
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
