import { renderAtlantisStorefront } from './atlantis-renderer';
import type { StorefrontRuntimeContext } from './types';

export async function renderUploadedStorefrontTheme(context: StorefrontRuntimeContext) {
  return renderAtlantisStorefront(context);
}
