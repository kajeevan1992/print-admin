export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-panel p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
