export type SelectOption = string | { label: string; value: string };

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[] }) {
  return (
    <select {...props} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm outline-none focus:border-accent">
      {options.map((option) => {
        if (typeof option === 'string') {
          return (
            <option key={option} value={option}>
              {option}
            </option>
          );
        }

        return (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        );
      })}
    </select>
  );
}
