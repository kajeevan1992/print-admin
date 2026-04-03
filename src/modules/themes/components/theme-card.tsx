import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/buttons';
import type { Theme } from '@/modules/themes/types';

export function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <Card>
      <div className="mb-3 h-28 rounded-lg border border-border bg-panelMuted p-3 text-lg font-semibold">{theme.previewImage}</div>
      <h3 className="font-semibold">{theme.name}</h3>
      <p className="text-xs text-textMuted">v{theme.version} · {theme.author}</p>
      <p className="mt-2 text-sm text-textMuted">{theme.description}</p>
      <div className="mt-3 flex gap-2">
        <Link className="text-accent" href={`/themes/${theme.id}`}>Preview</Link>
        <Button>Assign to Channel</Button>
      </div>
    </Card>
  );
}
