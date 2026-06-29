'use client';

import { useEffect } from 'react';

export function PublicStoreFrameBridge({ basePath }: { basePath: string }) {
  useEffect(() => {
    const handler = (event: any) => {
      const data = event?.data;
      if (!data || data.type !== 'holo-storefront:navigate') return;
      let path = String(data.path || '/');
      if (!path.startsWith('/')) path = `/${path}`;
      const nextPath = path === '/' ? basePath : `${basePath}${path}`;
      if (window.location.pathname !== nextPath) {
        window.history.pushState({ holoPublicStore: true }, '', nextPath);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [basePath]);

  return null;
}
