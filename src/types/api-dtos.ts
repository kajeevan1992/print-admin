export type TenantResolveResponse = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  hostname: string;
  primaryDomain?: string | null;
  themeKey: string;
  supportEmail?: string | null;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  userId: string;
  role: string;
  tenantId?: string | null;
  email: string;
  name: string;
};

export type ProductListItem = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  productType: string;
  priceFromMinor?: number | null;
  currency: string;
};

export type ProductDetailResponse = ProductListItem & {
  variants: Array<{
    id: string;
    name: string;
    sku?: string | null;
    priceMinor?: number | null;
    currency: string;
  }>;
};

export type CreateOrderRequest = {
  tenantId: string;
  customerId?: string | null;
  currency: string;
  items: Array<{
    productId?: string | null;
    titleSnapshot: string;
    quantity: number;
    unitPriceMinor: number;
    totalPriceMinor: number;
  }>;
  notes?: string;
};

export type OrderResponse = {
  orderNumber: string;
  tenantId: string;
  status: string;
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export type CreateArtworkRequest = {
  tenantId: string;
  orderId?: string | null;
  productId?: string | null;
  fileName: string;
  fileType: string;
  fileSizeBytes?: number | null;
  storageKey?: string | null;
  note?: string | null;
};

export type ArtworkResponse = {
  id: string;
  tenantId: string;
  status: string;
  fileName: string;
  fileType: string;
  fileSizeBytes?: number | null;
};
