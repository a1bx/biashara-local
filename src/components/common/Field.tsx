import { useId } from 'react';

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  multiline = false,
  rows = 3,
  hint
}: FieldProps) {
  const id = useId();
  const shared =
  'w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink placeholder:text-faint focus:border-brand/50 focus:outline-none';

  return (
    <div className="grid grid-cols-[130px_1fr] items-start gap-3">
      <label htmlFor={id} className="pt-2 text-xs text-muted">
        {label}
      </label>
      <div>
        {multiline ?
        <textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${shared} resize-y leading-relaxed`} /> :


        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={shared} />

        }
        {hint ? <p className="mt-1 text-2xs text-faint">{hint}</p> : null}
      </div>
    </div>);

}