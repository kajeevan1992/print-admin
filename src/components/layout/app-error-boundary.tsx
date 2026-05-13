'use client';

import React from 'react';

type State = {
  error: Error | null;
  info: React.ErrorInfo | null;
};

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, info });
    // Keep this visible in browser console for production debugging.
    console.error('[PrintAdminErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background px-4 py-8 text-text">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-rose-500/20 bg-rose-500/10 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-rose-200">Admin runtime guard</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">A client component failed to render.</h1>
          <p className="mt-3 text-sm leading-6 text-rose-100/90">
            The admin shell stayed online so the exact failing component can be fixed instead of showing a blank application error.
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Error</p>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-white">{this.state.error.message}</pre>
          </div>
          {this.state.info?.componentStack ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Component stack</p>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white">{this.state.info.componentStack}</pre>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => this.setState({ error: null, info: null })}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem('print-admin.session.v1');
                window.location.assign('/login');
              }}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white"
            >
              Clear session and login
            </button>
          </div>
        </div>
      </div>
    );
  }
}
