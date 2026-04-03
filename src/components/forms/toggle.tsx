export function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`inline-flex h-6 w-11 items-center rounded-full p-1 ${checked ? 'bg-accent' : 'bg-panelMuted'}`}>
      <span className={`h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}
