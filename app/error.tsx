'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('APP_ROUTE_ERROR', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Something went wrong</p>
        <p className="mt-2 text-sm text-slate-500">
          A route-level error occurred. This page did not load correctly, but the rest of the app should still be recoverable.
        </p>
        <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          {error?.message || 'Unknown application error'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
