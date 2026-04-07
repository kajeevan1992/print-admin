export type SelectOption = string | { label: string; value: string };

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[] }) {
  return (
    <select
      {...props}
      className="h-11 w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text outline-none transition focus:border-accent/70 focus:bg-panelMuted"
    >
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
