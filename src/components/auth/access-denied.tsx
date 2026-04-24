'use client';

import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';

export function AccessDenied() {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-8">
        <div className="inline-flex rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-200">
          <ShieldOff size={20} />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-white">Super admin access required</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-textMuted">
          This surface is reserved for the SaaS owner team. Use it to manage customers, licence limits, payments,
          deployments, store activations, and demo content across all tenant accounts.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/workspace"><PrimaryButton>Go to Workspace</PrimaryButton></Link>
          <Link href="/logout"><Button>Switch account</Button></Link>
        </div>
      </Card>
    </div>
  );
}
