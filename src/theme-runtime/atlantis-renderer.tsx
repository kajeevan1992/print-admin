import EnhancedHomePage from '@/themes/atlantis-native/EnhancedHomePage';
import CategoryPage from '@/themes/atlantis-native/CategoryPage';
import ProductPage from '@/themes/atlantis-native/ProductPage';
import QuoteRequestPage from '@/themes/atlantis-native/QuoteRequestPage';
import CustomerQuotePage from '@/themes/atlantis-native/CustomerQuotePage';
import CollectionPointsPage from '@/themes/atlantis-native/CollectionPointsPage';
import CartPage from '@/themes/atlantis-native/CartPage';
import CheckoutStatusPage from '@/themes/atlantis-native/CheckoutStatusPage';
import CustomerAccountPage from '@/themes/atlantis-native/CustomerAccountPage';
import CustomerArtworkProofPage from '@/themes/atlantis-native/CustomerArtworkProofPage';
import SearchResultsPage from '@/themes/atlantis-native/SearchResultsPage';
import { loadCollectionPoints } from '@/themes/atlantis-native/collection-points';
import { resolveStorefrontContentPage } from '@/theme-runtime/content-pages';
import { loadStorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';
import type { StorefrontRuntimeContext } from './types';

const ACCOUNT_SECTIONS = new Set(['overview', 'orders', 'quotes', 'artwork', 'invoices', 'addresses', 'profile']);
export async function renderAtlantisStorefront(context: StorefrontRuntimeContext) {
  const { tenantSlug, storeSlug, storeBase, navItems, products, categories = [], routeSegments, tenantIds, collectionPoints = [], searchParams, routeViews } = context;
  const settings = context.settings || await loadStorefrontRuntimeSettings(tenantSlug, storeSlug, tenantIds);
  if (!routeSegments.length) return <EnhancedHomePage storeBase={storeBase} navItems={navItems} settings={settings} products={products} categories={categories} collectionPoints={collectionPoints} />;
  if (routeSegments[0] === 'search') return <SearchResultsPage storeBase={storeBase} navItems={navItems} settings={settings} products={products} categories={categories} searchParams={searchParams || {}} />;
  if (routeSegments[0] === 'collection-points') return <CollectionPointsPage storeBase={storeBase} navItems={navItems} settings={settings} points={collectionPoints.length ? collectionPoints : await loadCollectionPoints(tenantIds)} />;
  if (routeSegments[0] === 'login') return <CustomerAccountPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} mode="login" returnUrl={searchParams?.return || ''} />;
  if (routeSegments[0] === 'two-step') return <CustomerAccountPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} mode="two-step" returnUrl={searchParams?.return || ''} />;
  if (routeSegments[0] === 'register') return <CustomerAccountPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} mode="register" returnUrl={searchParams?.return || ''} />;
  if (routeSegments[0] === 'forgot-password') return <CustomerAccountPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} mode="forgot-password" returnUrl={searchParams?.return || ''} />;
  if (routeSegments[0] === 'reset-password') return <CustomerAccountPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} mode="reset-password" token={searchParams?.token || ''} returnUrl={searchParams?.return || ''} />;
  if (routeSegments[0] === 'verify-email') return <CustomerAccountPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} mode="verify-email" token={searchParams?.token || ''} returnUrl={searchParams?.return || ''} />;
  if (routeSegments[0] === 'confirm-email-change') return <CustomerAccountPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} mode="confirm-email-change" token={searchParams?.token || ''} />;
  if (routeSegments[0] === 'artwork-proof') return <CustomerArtworkProofPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} token={searchParams?.token || ''} proofId={searchParams?.proof || ''} />;
  if (routeSegments[0] === 'account') { const requested = routeSegments[1] || 'overview'; const section = ACCOUNT_SECTIONS.has(requested) ? requested as 'overview' | 'orders' | 'quotes' | 'artwork' | 'invoices' | 'addresses' | 'profile' : 'overview'; return <CustomerAccountPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} mode="dashboard" section={section} returnUrl={`${storeBase}/account${section === 'overview' ? '' : `/${section}`}`} />; }
  if (routeSegments[0] === 'quote-status' && routeSegments[1]) return <CustomerQuotePage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} quoteId={routeSegments[1]} searchParams={searchParams || {}} />;
  if (routeSegments[0] === 'checkout-success') return <CheckoutStatusPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} status="success" searchParams={searchParams || {}} />;
  if (routeSegments[0] === 'checkout-cancel') return <CheckoutStatusPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} status="cancel" searchParams={searchParams || {}} />;
  if (routeSegments[0] === 'cart') return <CartPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} productSlug={searchParams?.product} categorySlug={searchParams?.category} products={products} searchParams={searchParams || {}} />;
  if (routeSegments[0] === 'quote' && routeSegments.length >= 3) return <QuoteRequestPage storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} tenantSlug={tenantSlug} storeSlug={storeSlug} category={routeSegments[1]} slug={routeSegments[2]} products={products} searchParams={searchParams || {}} />;
  const contentPage = resolveStorefrontContentPage(settings.pages || [], routeSegments, products, categories, { includeDisabled: context.isDraftPreview });
  if (contentPage) return <EnhancedHomePage storeBase={storeBase} navItems={navItems} settings={{ ...settings, sections: contentPage.sections }} products={products} categories={categories} collectionPoints={collectionPoints} />;
  if (routeSegments.length >= 2) return <ProductPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} category={routeSegments[0]} slug={routeSegments[routeSegments.length - 1]} products={products} searchParams={searchParams || {}} />;
  return <CategoryPage storeBase={storeBase} navItems={navItems} settings={settings} routeViews={routeViews} slug={routeSegments[0]} products={products} categories={categories} />;
}
