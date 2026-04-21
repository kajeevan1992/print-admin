const DEFAULT_EXTERNAL_API_BASE = "http://y46josgjr3wve61rhl5xwivq.13.61.22.39.sslip.io";

export function getExternalApiBaseUrl() {
  const raw =
    process.env.EXTERNAL_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL ||
    DEFAULT_EXTERNAL_API_BASE;

  return raw.replace(/\/$/, "");
}
