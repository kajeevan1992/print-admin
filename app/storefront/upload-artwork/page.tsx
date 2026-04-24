'use client';

import { PublicStorefrontLayout } from '@/components/storefront/public-storefront-layout';
import { StorefrontSection } from '@/components/storefront/storefront-section';
import { UploadDropzoneCard } from '@/components/storefront/upload-dropzone-card';
import { UploadGuidelinesPanel } from '@/components/storefront/upload-guidelines-panel';
import { UploadRecordsPanel } from '@/components/storefront/upload-records-panel';
import { UploadOrderAttachmentPanel } from '@/components/storefront/upload-order-attachment-panel';

export default function UploadArtworkPage() {
  return (
    <PublicStorefrontLayout announcement="v132 artwork upload system frontend is now live with upload, file status, and order-attachment workflow foundations.">
      <StorefrontSection
        eyebrow="Artwork upload"
        title="Artwork upload foundation"
        body="This is the customer-facing artwork workflow layer we can later connect to storage, preflight checks, approvals, and order records."
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <UploadDropzoneCard />
            <UploadRecordsPanel />
          </div>

          <div className="space-y-4">
            <UploadGuidelinesPanel />
            <UploadOrderAttachmentPanel />
          </div>
        </div>
      </StorefrontSection>
    </PublicStorefrontLayout>
  );
}
