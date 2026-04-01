export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }) {
  return (
    <select {...props} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm outline-none focus:border-accent">
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}
