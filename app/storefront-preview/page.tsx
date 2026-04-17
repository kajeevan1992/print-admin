'use client';

import { useEffect, useState } from 'react';
import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { StorefrontPageRenderer } from '@/components/storefront/storefront-page-renderer';
import { demoPage, type PageSchema } from '@/storefront/editor/page-schema';
import { loadSavedStorefrontPageConfig } from '@/components/editor/page-config-storage';

export default function StorefrontPreviewPage() {
  const [page, setPage] = useState<PageSchema>(demoPage);

  useEffect(() => {
    const saved = loadSavedStorefrontPageConfig();
    if (saved) setPage(saved);
  }, []);

  return (
    <PublicStorefrontLayout announcement="v130 editor-to-storefront rendering is now live. Saved editor output can now drive storefront page rendering.">
      <StorefrontSection
        eyebrow="Storefront rendering"
        title="Schema-driven storefront preview"
        body="This page reads the saved visual-editor page config and renders it as a storefront output preview, which is the bridge toward tenant-specific page persistence later."
      >
        <div className="mb-4 rounded-3xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
          <p className="text-sm font-semibold">How to test this</p>
          <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            <p>1. Open /storefront-editor and change the page.</p>
            <p>2. Click Save config.</p>
            <p>3. Open /storefront-preview.</p>
            <p>4. Confirm the storefront preview renders the saved schema.</p>
          </div>
        </div>

        <StorefrontPageRenderer page={page} />
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
