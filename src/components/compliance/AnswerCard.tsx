import React from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import type { ComplianceAnswer } from '../../types';
import { relativeTime } from '../../utils/format';
import { FollowUpQuestions } from './FollowUpQuestions';
import { SourceCitation } from './SourceCitation';

interface AnswerCardProps {
  answer: ComplianceAnswer;
  onFollowUp: (question: string) => void;
  onViewSource: (sourceId: string) => void;
}

export function AnswerCard({
  answer,
  onFollowUp,
  onViewSource
}: AnswerCardProps) {
  return (
    <article className="space-y-3">
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-lg rounded-tr-none border border-brand/25 bg-brand/10 px-3.5 py-2.5 text-xs text-ink">
          {answer.question}
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        {answer.confident ?
        <>
            <h3 className="text-2xs font-semibold uppercase tracking-wide text-faint">
              Answer
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ink">
              {answer.summary}
            </p>
            <ul className="mt-3 space-y-1.5">
              {answer.bullets.map((bullet) =>
            <li
              key={bullet}
              className="flex gap-2 text-xs leading-relaxed text-muted">
              
                  <span
                className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand"
                aria-hidden="true" />
              
                  {bullet}
                </li>
            )}
            </ul>
            <SourceCitation
            answer={answer}
            onViewSource={() => onViewSource(answer.sourceId)} />
          
          </> :

        <div className="rounded-lg border border-warn/25 bg-warn/5 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-warn">
              <AlertTriangleIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {answer.summary}
            </p>
            <p className="mt-1.5 text-2xs leading-relaxed text-muted">
              {answer.bullets[0]}
            </p>
          </div>
        }

        <FollowUpQuestions questions={answer.followUps} onSelect={onFollowUp} />

        <p className="mt-4 border-t border-hairline pt-2.5 text-2xs text-faint">
          Answered locally · {relativeTime(answer.askedAt)}
        </p>
      </div>
    </article>);

}