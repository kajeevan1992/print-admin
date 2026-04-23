export const PUBLIC_API_VERSIONS = ['v1'] as const;

export type PublicApiVersion = (typeof PUBLIC_API_VERSIONS)[number];

export function isSupportedPublicApiVersion(version: string): version is PublicApiVersion {
  return PUBLIC_API_VERSIONS.includes(version as PublicApiVersion);
}
