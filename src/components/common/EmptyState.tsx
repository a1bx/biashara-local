import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondary?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondary
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-raised text-muted">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-faint">
        {description}
      </p>
      {actionLabel && onAction ?
      <div className="mt-5 flex items-center gap-2">
          <Button onClick={onAction}>{actionLabel}</Button>
          {secondary}
        </div> :
      null}
    </div>);

}