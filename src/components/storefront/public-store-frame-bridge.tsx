'use client';

import { useEffect } from 'react';

type Props = {
  basePath: string;
  frameId?: string;
  rendererBasePath?: string;
};

function normalise(path: unknown) {
  let text = String(path || '/');
  if (!text.startsWith('/')) text = `/${text}`;
  return text;
}

function toPublicStorePath(basePath: string, rendererBasePath: string | undefined, rawPath: unknown) {
  let path = normalise(rawPath);
  if (rendererBasePath && path.startsWith(rendererBasePath)) {
    path = path.slice(rendererBasePath.length) || '/';
  }
  return path === '/' ? basePath : `${basePath}${path}`;
}

export function PublicStoreFrameBridge({ basePath, frameId, rendererBasePath }: Props) {
  useEffect(() => {
    function applyPath(rawPath: unknown) {
      const nextPath = toPublicStorePath(basePath, rendererBasePath, rawPath);
      if (window.location.pathname !== nextPath) {
        window.history.pushState({ holoPublicStore: true }, '', nextPath);
      }
    }

    const messageHandler = (event: MessageEvent) => {
      const data = event.data || {};
      if (!data || data.type !== 'holo-storefront:navigate') return;
      applyPath(data.path || '/');
    };

    const timer = window.setInterval(() => {
      if (!frameId) return;
      const iframe = document.getElementById(frameId) as HTMLIFrameElement | null;
      try {
        const framePath = iframe?.contentWindow?.location?.pathname;
        if (framePath) applyPath(framePath);
      } catch {
        // Ignore cross-origin frames. Uploaded theme renderer is expected to be same-origin.
      }
    }, 600);

    window.addEventListener('message', messageHandler);
    return () => {
      window.removeEventListener('message', messageHandler);
      window.clearInterval(timer);
    };
  }, [basePath, frameId, rendererBasePath]);

  return null;
}
