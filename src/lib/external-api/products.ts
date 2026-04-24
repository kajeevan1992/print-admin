export type AtlantisProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  productType: string;
  priceFromMinor: number | null;
  currency: string;
  imageHint?: string;
};

function moneyToMinor(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }
  return null;
}

export function normalizeExternalProducts(payload: any): AtlantisProduct[] {
  const rawItems = payload?.data?.items || payload?.data || [];
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((item: any) => ({
      id: String(item.id ?? ""),
      slug: String(item.slug ?? ""),
      title: String(item.title ?? item.name ?? ""),
      subtitle: String(item.subtitle ?? item.shortDescription ?? item.description ?? ""),
      productType: item.productType || (item.requiresQuote ? "QUOTE_LED" : item.artworkMode === "upload" ? "UPLOAD_LED" : "STANDARD"),
      priceFromMinor:
        typeof item.priceFromMinor === "number"
          ? item.priceFromMinor
          : moneyToMinor(item.basePrice ?? item.price ?? item.startingPrice),
      currency: item.currency || "GBP",
      imageHint: item.slug || item.name || "",
    }))
    .filter((item) => item.id && item.slug && item.title);
}
