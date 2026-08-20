import React from 'react';
import { BookOpenIcon, ExternalLinkIcon } from 'lucide-react';
import type { ComplianceAnswer } from '../../types';

interface SourceCitationProps {
  answer: ComplianceAnswer;
  onViewSource: () => void;
}

export function SourceCitation({ answer, onViewSource }: SourceCitationProps) {
  return (
    <div className="mt-4 rounded-lg border border-line bg-panel px-3.5 py-3">
      <p className="text-2xs font-semibold uppercase tracking-wide text-faint">
        Source
      </p>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs text-ink">
          <BookOpenIcon className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          {answer.sourceTitle}
          <span className="text-faint">
            · {answer.sourceHeading} · snapshot {answer.sourceSnapshot}
          </span>
        </p>
        <button
          type="button"
          onClick={onViewSource}
          className="inline-flex items-center gap-1 text-2xs font-medium text-brand-bright transition-colors duration-150 ease-out hover:text-brand">
          
          View source
          <ExternalLinkIcon className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>);

}