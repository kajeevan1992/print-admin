import EnhancedHomePage from '@/themes/atlantis-native/EnhancedHomePage';
import CategoryPage from '@/themes/atlantis-native/CategoryPage';
import ProductPage from '@/themes/atlantis-native/ProductPage';
import QuoteRequestPage from '@/themes/atlantis-native/QuoteRequestPage';
import CollectionPointsPage from '@/themes/atlantis-native/CollectionPointsPage';
import { loadCollectionPoints } from '@/themes/atlantis-native/collection-points';
import type { StorefrontRuntimeContext } from './types';

export async function renderAtlantisStorefront(context: StorefrontRuntimeContext) {
  const { storeBase, navItems, products, routeSegments, tenantIds, collectionPoints } = context;
  if (!routeSegments.length) return <EnhancedHomePage storeBase={storeBase} navItems={navItems} products={products} />;
  if (routeSegments[0] === 'collection-points') return <CollectionPointsPage storeBase={storeBase} navItems={navItems} points={collectionPoints || await loadCollectionPoints(tenantIds)} />;
  if (routeSegments.length >= 2) return <ProductPage storeBase={storeBase} navItems={navItems} category={routeSegments[0]} slug={routeSegments[routeSegments.length - 1]} products={products} />;
  return <CategoryPage storeBase={storeBase} navItems={navItems} slug={routeSegments[0]} products={products} />;
}
