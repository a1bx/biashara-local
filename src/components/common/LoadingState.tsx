import { CheckIcon, LoaderIcon } from 'lucide-react';

interface LoadingStateProps {
  stages: readonly string[];
  currentStage: number;
  title?: string;
  note?: string;
}

export function LoadingState({
  stages,
  currentStage,
  title = 'Processing locally',
  note = 'This runs on your device. Nothing is uploaded.'
}: LoadingStateProps) {
  return (
    <div
      className="px-5 py-6"
      role="status"
      aria-live="polite"
      aria-label={stages[Math.min(currentStage, stages.length - 1)]}>
      
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <ol className="mt-4 space-y-2.5">
        {stages.map((stage, index) => {
          const done = index < currentStage;
          const active = index === currentStage;
          return (
            <li key={stage} className="flex items-center gap-2.5 text-xs">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                done ?
                'border-success/40 bg-success/10 text-success' :
                active ?
                'border-brand/50 bg-brand/10 text-brand-bright' :
                'border-line bg-raised text-faint'}`
                }>
                
                {done ?
                <CheckIcon className="h-3 w-3" aria-hidden="true" /> :
                active ?
                <LoaderIcon
                  className="h-3 w-3 animate-spin"
                  aria-hidden="true" /> :


                <span className="h-1 w-1 rounded-full bg-current" />
                }
              </span>
              <span className={done || active ? 'text-ink' : 'text-faint'}>
                {stage}
              </span>
            </li>);

        })}
      </ol>
      <p className="mt-4 text-2xs text-faint">{note}</p>
    </div>);

}