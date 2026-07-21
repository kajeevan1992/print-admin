'use client';

import { useEffect } from 'react';

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'code',
  'challenge',
  'verification',
  'resetToken',
  'emailChangeToken',
]);

export default function StorefrontSensitiveUrlGuard() {
  useEffect(() => {
    const current = new URL(window.location.href);
    let changed = false;

    for (const key of Array.from(current.searchParams.keys())) {
      if (!SENSITIVE_QUERY_KEYS.has(key)) continue;
      current.searchParams.delete(key);
      changed = true;
    }

    if (!changed) return;
    const search = current.searchParams.toString();
    window.history.replaceState(window.history.state, '', `${current.pathname}${search ? `?${search}` : ''}${current.hash}`);
  }, []);

  return null;
}
