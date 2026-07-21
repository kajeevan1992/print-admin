// Compatibility entrypoint for the original artwork-proof module.
// The authoritative implementation now lives with the storefront artwork and
// production bridge because proof revisions, customer decisions and release
// gates must be handled as one workflow.
export {
  createArtworkProofRevision,
  decideArtworkProof,
  getCustomerArtworkProof,
  listAdminArtworkProofs,
  listCustomerArtworkProofs,
  readAdminArtworkProofFile,
  readCustomerArtworkProofFile,
  resendArtworkProof,
  withdrawArtworkProof,
  type ArtworkProofStatus,
} from '@/core/storefront/artwork-proof.service';
