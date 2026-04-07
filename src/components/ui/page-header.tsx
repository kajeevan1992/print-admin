export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <h1 className="text-[1.55rem] font-semibold tracking-[-0.05em] text-white sm:text-[1.85rem]">{title}</h1>
        <p className="mt-1.5 max-w-3xl text-[12.5px] leading-6 text-textMuted">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
