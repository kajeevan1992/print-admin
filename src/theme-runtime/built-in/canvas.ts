import CanvasHomePage from '@/v0-themes/canvas/CanvasHomePage';
import { CANVAS_ROUTE_VIEWS } from '@/v0-themes/canvas/RouteViews';
import { CANVAS_V0_MANIFEST } from '@/v0-themes/canvas/manifest';
import { renderV0ThemePackage } from '@/theme-runtime/v0-package-adapter';
import type { StorefrontThemeDefinition } from '@/theme-runtime/types';

export const CANVAS_THEME_DEFINITION: StorefrontThemeDefinition = {
  manifest: {
    ...CANVAS_V0_MANIFEST,
    key: 'canvas-native',
    aliases: ['canvas'],
    source: 'built-in',
  },
  renderer: (context) => renderV0ThemePackage(context, {
    themeKey: 'canvas-native',
    themeStyle: 'canvas',
    HomePage: CanvasHomePage,
    routeViews: CANVAS_ROUTE_VIEWS,
    widgetAppearance: CANVAS_V0_MANIFEST.widgetAppearance,
  }),
};
