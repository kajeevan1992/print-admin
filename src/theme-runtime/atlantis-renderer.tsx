import EnhancedHomePage from '@/themes/atlantis-native/EnhancedHomePage';
import CategoryPage from '@/themes/atlantis-native/CategoryPage';
import ProductPage from '@/themes/atlantis-native/ProductPage';
import QuoteRequestPage from '@/themes/atlantis-native/QuoteRequestPage';
import CollectionPointsPage from '@/themes/atlantis-native/CollectionPointsPage';
import CartPage from '@/themes/atlantis-native/CartPage';
import CheckoutStatusPage from '@/themes/atlantis-native/CheckoutStatusPage';
import { loadCollectionPoints } from '@/themes/atlantis-native/collection-points';
import type { StorefrontRuntimeContext } from './types';

export async function renderAtlantisStorefront(context: StorefrontRuntimeContext) {
  const { tenantSlug, storeSlug, storeBase, navItems, products, routeSegments, tenantIds, collectionPoints, searchParams } = context;
  if (!routeSegments.length) return <EnhancedHomePage storeBase={storeBase} navItems={navItems} products={products} />;
  if (routeSegments[0] === 'collection-points') return <CollectionPointsPage storeBase={storeBase} navItems={navItems} points={collectionPoints || await loadCollectionPoints(tenantIds)} />;
  if (routeSegments[0] === 'checkout-success') return <CheckoutStatusPage storeBase={storeBase} navItems={navItems} status="success" searchParams={searchParams || {}} />;
  if (routeSegments[0] === 'checkout-cancel') return <CheckoutStatusPage storeBase={storeBase} navItems={navItems} status="cancel" searchParams={searchParams || {}} />;
  if (routeSegments[0] === 'cart') return <CartPage tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} navItems={navItems} productSlug={searchParams?.product} categorySlug={searchParams?.category} products={products} searchParams={searchParams || {}} />;
  if (routeSegments[0] === 'quote' && routeSegments.length >= 3) return <QuoteRequestPage storeBase={storeBase} navItems={navItems} tenantSlug={tenantSlug} storeSlug={storeSlug} category={routeSegments[1]} slug={routeSegments[2]} products={products} searchParams={searchParams || {}} />;
  if (routeSegments.length >= 2) return <ProductPage storeBase={storeBase} navItems={navItems} category={routeSegments[0]} slug={routeSegments[routeSegments.length - 1]} products={products} searchParams={searchParams || {}} />;
  return <CategoryPage storeBase={storeBase} navItems={navItems} slug={routeSegments[0]} products={products} />;
}
