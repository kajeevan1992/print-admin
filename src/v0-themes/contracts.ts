import type { ComponentType, ReactNode } from 'react';

export type V0ThemeFieldType = 'text' | 'textarea' | 'image' | 'colour' | 'boolean' | 'number' | 'select' | 'sections';
export type V0ThemeField = {
  path: string;
  label: string;
  type: V0ThemeFieldType;
  group?: string;
  description?: string;
  options?: Array<{ label: string; value: string }>;
};

export type V0ThemeWidgetAppearance = {
  surface?: 'card' | 'soft' | 'flat';
  density?: 'compact' | 'comfortable' | 'spacious';
  radius?: 'small' | 'medium' | 'large';
  optionStyle?: 'auto' | 'cards' | 'pills' | 'segments';
  fieldStyle?: 'outline' | 'filled' | 'underline';
  buttonStyle?: 'pill' | 'rounded' | 'square';
  priceStyle?: 'panel' | 'highlight' | 'minimal';
  shadow?: 'none' | 'soft' | 'strong';
  labelStyle?: 'normal' | 'uppercase';
};

export type V0ThemePackageManifest = {
  key: string;
  aliases?: string[];
  name: string;
  version: string;
  description: string;
  widgetAppearance?: V0ThemeWidgetAppearance;
  editor: {
    content: V0ThemeField[];
    settings: V0ThemeField[];
  };
};

export type V0ThemeBrand = {
  name: string;
  logoUrl: string;
  primary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  border: string;
};

export type V0ThemeNavigationItem = {
  label: string;
  href: string;
  active: boolean;
};

export type V0ThemeProduct = {
  slug: string;
  category: string;
  title: string;
  description: string;
  image: string;
  images?: string[];
  price: string;
  href: string;
};

export type V0ThemeCategory = {
  slug: string;
  title: string;
  description: string;
  image: string;
  productCount: number;
  href: string;
};

export type V0ThemeCollectionPoint = {
  slug: string;
  name: string;
  address: string;
  note: string;
};

export type V0ThemeSection = Record<string, unknown> & {
  id: string;
  type: string;
  enabled: boolean;
};

export type V0ThemePageContext = {
  basePath: string;
  currentPath: string;
  preview: boolean;
  brand: V0ThemeBrand;
  navigation: V0ThemeNavigationItem[];
  content: Record<string, unknown>;
  layout: Record<string, unknown>;
  chromeSlots?: {
    basket?: ReactNode;
  };
};

export type V0ThemeHomeProps = V0ThemePageContext & {
  products: V0ThemeProduct[];
  categories: V0ThemeCategory[];
  collectionPoints: V0ThemeCollectionPoint[];
  sections: V0ThemeSection[];
  slots?: {
    previewBanner?: ReactNode;
  };
};

export type V0ThemeCategoryPageProps = V0ThemePageContext & {
  category: V0ThemeCategory;
  allProducts: boolean;
  products: V0ThemeProduct[];
};

export type V0ThemeProductPageProps = V0ThemePageContext & {
  status: 'available' | 'unavailable';
  product?: V0ThemeProduct & { buyingMode: 'cart' | 'quote'; shareUrl: string };
  quoteReference?: string;
  slots?: {
    purchase?: ReactNode;
  };
};

export type V0ThemeSelectedOption = {
  key: string;
  label: string;
  value: string;
};

export type V0ThemeQuotePageProps = V0ThemePageContext & {
  product?: V0ThemeProduct;
  selectedOptions: V0ThemeSelectedOption[];
  editOptionsHref: string;
  slots: {
    form: ReactNode;
  };
};

export type V0ThemeBasketSummary = {
  basketId: string;
  lineCount: number;
  itemCount: number;
  currency: string;
  netMinor: number;
  vatMinor: number;
  grossMinor: number;
  formattedTotal: string;
};

export type V0ThemeBasketLine = {
  id: string;
  productSlug: string;
  categorySlug: string;
  productName: string;
  image: string;
  quantity: number;
  delivery: string;
  formattedTotal: string;
  selectedOptions: V0ThemeSelectedOption[];
  artworkStatus: string;
  editHref: string;
};

export type V0ThemeCartPageProps = V0ThemePageContext & {
  basket: V0ThemeBasketSummary;
  lines: V0ThemeBasketLine[];
  slots: {
    basket: ReactNode;
  };
  product?: V0ThemeProduct;
  selectedOptions?: V0ThemeSelectedOption[];
  quantity?: number;
  delivery?: string;
  configuredProductHref?: string;
};

export type V0ThemeCheckoutStatusPageProps = V0ThemePageContext & {
  status: 'success' | 'cancel';
  orderId: string;
};

export type V0ThemeRouteViews = {
  CategoryPage?: ComponentType<V0ThemeCategoryPageProps>;
  ProductPage?: ComponentType<V0ThemeProductPageProps>;
  QuotePage?: ComponentType<V0ThemeQuotePageProps>;
  CartPage?: ComponentType<V0ThemeCartPageProps>;
  CheckoutStatusPage?: ComponentType<V0ThemeCheckoutStatusPageProps>;
};
