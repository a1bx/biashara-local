export type BadgeTone =
'success' |
'neutral' |
'brand' |
'warn' |
'danger' |
'info';

const TONES: Record<BadgeTone, string> = {
  success: 'bg-success/10 text-success border-success/25',
  neutral: 'bg-raised text-muted border-line',
  brand: 'bg-brand/10 text-brand-bright border-brand/25',
  warn: 'bg-warn/10 text-warn border-warn/25',
  danger: 'bg-expense/10 text-expense border-expense/25',
  info: 'bg-info/10 text-info border-info/25'
};

export function toneForStatus(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === 'parsed' || s === 'final' || s === 'indexed') return 'success';
  if (s === 'draft') return 'warn';
  if (s === 'failed') return 'danger';
  if (s === 'source') return 'info';
  return 'neutral';
}

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({
  children,
  tone = 'neutral',
  icon,
  className = ''
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-2xs font-medium ${TONES[tone]} ${className}`}>
      
      {icon}
      {children}
    </span>);

}