# SaaS Existing Artwork Module Audit

This note records the existing SaaS modules that must be extended before adding any new artwork/customer upload screens.

## Existing modules found

- `app/storefront/upload-artwork/page.tsx`
  - Existing customer-facing storefront artwork page.
  - Current state: frontend foundation shell.
  - Uses the existing storefront layout and upload panels.

- `src/components/storefront/upload-dropzone-card.tsx`
  - Existing upload card component.
  - Current state: visual shell, no real file input/API submit.

- `src/components/storefront/upload-records-panel.tsx`
  - Existing recent uploads panel.
  - Current state: seed data from `artworkUploadSeed`.

- `src/components/storefront/upload-order-attachment-panel.tsx`
  - Existing order attachment panel.
  - Current state: visual workflow options only.

- `app/api/native-storefront/artwork-revision/route.ts`
  - Existing live customer replacement artwork endpoint added in the recent workflow builds.
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

The next implementation should connect `app/storefront/upload-artwork/page.tsx` and its existing components to `/api/native-storefront/artwork-revision` instead of relying on the duplicate `/upload-artwork` route.

## Duplicate to remove or redirect

- `app/upload-artwork/page.tsx`
  - This was added as a temporary live customer upload page.
  - It should be replaced by the existing SaaS route or redirected to `app/storefront/upload-artwork/page.tsx` once the existing route is connected.

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
