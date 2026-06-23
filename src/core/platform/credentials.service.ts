export {
  createPlatformApiKey as makeCredential,
  listPlatformApiKeys as listCredentials,
  revokePlatformApiKey as disableCredential,
  updatePlatformApiKey as changeCredential,
  verifyPublicApiKey as verifyCredential,
  verifySignedPublicApiRequest as verifySignedCredential,
} from '@/core/api-keys/platform-api-keys.service';
