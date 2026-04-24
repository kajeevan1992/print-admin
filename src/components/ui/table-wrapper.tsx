export function TableWrapper({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-panel">{children}</div>;
}
