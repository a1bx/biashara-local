import React from 'react';

interface FollowUpQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function FollowUpQuestions({
  questions,
  onSelect
}: FollowUpQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-2xs text-faint">Follow-up questions you can ask:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {questions.map((question) =>
        <button
          key={question}
          type="button"
          onClick={() => onSelect(question)}
          className="rounded-lg border border-line bg-panel px-2.5 py-1.5 text-2xs text-muted transition-colors duration-150 ease-out hover:border-brand/40 hover:text-brand-bright">
          
            {question}
          </button>
        )}
      </div>
    </div>);

}