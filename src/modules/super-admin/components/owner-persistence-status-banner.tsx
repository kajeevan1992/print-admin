import { Button } from '@/components/ui/buttons';

export type OwnerPersistenceMeta = {
  persistedCount: number;
  seedCount: number;
  hasPersistedRows: boolean;
  usingSeedRows: boolean;
  resource: string;
};

export function OwnerPersistenceStatusBanner({
  meta,
  onPersistSeed,
}: {
  meta: OwnerPersistenceMeta | null;
  onPersistSeed?: () => void | Promise<void>;
}) {
  if (!meta) {
    return (
      <div className="mb-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-textMuted">
        Checking owner persistence state...
      </div>
    );
  }

  const isSeed = meta.usingSeedRows;

  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${isSeed ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>
      <div>
        <p className="font-medium text-white">{isSeed ? 'Showing seed preview rows' : 'Loaded saved database rows'}</p>
        <p className="mt-1 text-xs opacity-80">
          Resource: {meta.resource} · Saved rows: {meta.persistedCount} · Seed rows: {meta.seedCount}
        </p>
      </div>
      {isSeed && onPersistSeed ? <Button onClick={() => void onPersistSeed()}>Persist Seed Rows</Button> : null}
    </div>
  );
}
