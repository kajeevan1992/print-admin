export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm outline-none focus:border-accent" />;
}
