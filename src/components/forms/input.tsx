import { useId } from 'react';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const name = props.name ?? props.id ?? generatedId;

  return (
    <input
      {...props}
      id={id}
      name={name}
      className="h-11 w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text outline-none transition placeholder:text-textMuted/70 focus:border-accent/70 focus:bg-panelMuted"
    />
  );
}
