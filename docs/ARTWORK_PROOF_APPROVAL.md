# Artwork proof revisions and customer approval

## Architecture

This workflow extends the existing artwork upload, preflight, production-ticket and proof/payment release gate. It does not create a second order, artwork or production system.

The original `src/core/operations/artwork-proofs.service.ts` module is retained only as a compatibility entrypoint. The authoritative proof revision implementation is `src/core/storefront/artwork-proof.service.ts`, because customer decisions and the storefront production handoff must be updated together.

## Staff workflow

1. Open an existing production ticket under `/production/jobs/{ticketId}`.
2. Choose the storefront associated with the customer order.
3. Confirm or correct the customer name and email.
4. Upload a PDF, PNG or JPEG proof of no more than 20 MB.
5. Add an optional message describing the revision or points to check.
6. Send the secure 14-day customer link.

A new revision supersedes any older revision that is still awaiting a decision. Superseded revisions remain available for audit and cannot be approved.

Staff can resend the active secure link, which rotates its token and expiry, or withdraw an undecided revision. A withdrawn revision keeps the production proof gate held.

## Customer workflow

Customers can review proofs from either:

- the secure emailed link, without creating an account; or
- Account → Artwork, when the proof email matches their signed-in customer account.

The proof page allows the customer to open or download the exact file, approve it for production, or request changes with a required note.

Approval is final for that revision. A later correction requires the artwork team to upload a new revision.

## Production release gate

Proof decisions update the existing `production-job-tickets` record:

- sending a proof sets the proof gate to pending customer approval;
- approval releases the proof gate;
- a change request blocks the proof gate and records the customer note;
- withdrawal holds the proof gate.

Production can start only when both the existing payment gate and the proof gate are released. Proof approval never bypasses payment, prepress or operational checks.

Every proof action appends to both the immutable proof event history and the existing production ticket stage history.

## Storage and security

Proof revisions and file bytes are stored in tenant/store-scoped PostgreSQL tables created by the service:

- `StorefrontArtworkProofRevision`
- `StorefrontArtworkProofEvent`

Controls include:

- PDF, PNG and JPEG signature validation;
- 20 MB per revision;
- 40 retained revisions per production ticket;
- SHA-256 file checksums;
- random 48-byte customer tokens stored only as SHA-256 hashes;
- 14-day link expiry and token rotation on resend;
- exact tenant, storefront, production-ticket and customer ownership checks;
- private/no-store API and file responses;
- noindex, nofollow and no-referrer storefront metadata;
- sensitive token removal from browser history;
- rate limits on customer reads, decisions and file delivery;
- admin-session protection on all staff routes.

Uploaded themes receive only the SaaS-rendered protected proof page or account slot. Themes cannot read proof tokens, file bytes, customer identity, production tickets or decision authority.

## Legacy consolidation

The earlier `/api/internal/artwork-proofs` endpoint referenced Prisma `Artwork` and `ArtworkVersion` models that are not part of the current schema and did not enforce an admin session. The same route is now the authenticated revision endpoint. The old record-style JSON mutation path is retired; new revisions use verified multipart uploads and the existing production ticket as authority.

## Operational note

No proof should be treated as production approval outside this workflow once a revision has been sent. Staff should not manually change `customerProofStatus` to approved. Customer decisions or an explicitly audited support process must release the proof gate.
