'use client';

import Link from 'next/link';
import { Activity, ClipboardCheck, Mail, Map, Rocket } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';

const tools = [
  ['Location Manager', '/location-manager', Map, 'Manage stores, branches, collection points and service areas.'],
  ['Collection Handover', '/collection-handover', ClipboardCheck, 'Verify collection passes and mark orders collected.'],
  ['Ready Collection Automation', '/ready-collection-automation', Activity, 'Queue ready-for-collection messages for ready orders.'],
  ['Email Send Controls', '/email-send-controls', Mail, 'Process queued outbox emails through tenant SMTP settings.'],
] as const;

export function LaunchOperationsPage() {
  return (
    <div>
      <PageHeader
        title="Launch Operations"
        subtitle="Quick access to the Holo Print launch tools for locations, collection handover and email sending."
        actions={<Link href="/location-manager" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Open Location Manager</Link>}
      />
      <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
        <Rocket className="mr-2 inline h-4 w-4" /> These links reuse existing modules. No duplicate workflows are created here.
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tools.map(([title, href, Icon, body]) => (
          <Link key={href} href={href}>
            <Card className="h-full transition hover:border-sky-500/40 hover:bg-white/[0.05]">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-200">
                <Icon size={18} />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-textMuted">{body}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
