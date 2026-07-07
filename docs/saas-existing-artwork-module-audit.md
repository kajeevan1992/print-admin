# SaaS Existing Artwork Module Audit

This note records the existing SaaS modules that must be extended before adding any new artwork/customer upload screens.

## Existing modules found

- `app/storefront/upload-artwork/page.tsx`
  - Existing customer-facing storefront artwork page.
  - Current state: live customer replacement upload page using the existing storefront layout and upload panels.
  - Uses `UploadDropzoneCard`, which now posts to `/api/native-storefront/artwork-revision`.

- `src/components/storefront/upload-dropzone-card.tsx`
  - Existing upload card component.
  - Current state: live file picker and order upload form.
  - Handles order number, optional email, optional note, file upload, success/error state, and latest upload/preflight summary.

- `src/components/storefront/upload-records-panel.tsx`
  - Existing recent uploads panel.
  - Current state: seed data from `artworkUploadSeed`.
  - Next build target: connect this panel to live artwork upload records instead of seed data.

- `src/components/storefront/upload-order-attachment-panel.tsx`
  - Existing order attachment panel.
  - Current state: visual workflow options only.
  - Next build target: reflect live order/proof ticket attachment state.

- `app/api/native-storefront/artwork-revision/route.ts`
  - Existing live customer replacement artwork endpoint.
  - Current state: validates order/email, saves file through the existing artwork upload service, runs existing preflight, updates proof ticket, records revision history, and keeps matching planner job blocked until approval.

- `app/api/internal/storefront/artwork/upload/route.ts`
  - Existing internal storefront artwork upload endpoint.
  - Uses `saveArtworkUpload`, metadata DB bridge, and storage status.

- `src/core/storefront/internal-artwork-storage.ts`
  - Existing artwork file storage and preflight service.

- `src/core/storefront/internal-artwork-db.ts`
  - Existing DB bridge for artwork metadata.

- `src/modules/artwork/pages/artwork-uploads-page.tsx`
  - Existing admin artwork uploads screen.

- `src/modules/operations/pages/artwork-proofing-page.tsx`
  - Existing proofing workflow screen.

## Rule going forward

Do not create another standalone customer artwork upload module without first checking these files.

Extend `app/storefront/upload-artwork/page.tsx` and its existing components before adding any new customer upload route.

## Duplicate route cleanup

- `app/upload-artwork/page.tsx`
  - Status: removed.
  - The old `/upload-artwork` URL now redirects to `/storefront/upload-artwork` from `next.config.mjs`.

## Desired final flow

Customer proof change requested
→ customer opens existing SaaS artwork upload route
→ replacement file posts to `/api/native-storefront/artwork-revision`
→ existing storage/preflight service runs
→ proof ticket updates
→ revision history updates
→ planner remains blocked
→ customer approves proof
→ planner releases production
