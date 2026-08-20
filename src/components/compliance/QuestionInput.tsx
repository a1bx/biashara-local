import React, { useState } from 'react';
import { SendIcon } from 'lucide-react';
import { Button } from '../common/Button';

interface QuestionInputProps {
  onSubmit: (question: string) => void;
  busy: boolean;
  placeholder?: string;
}

export function QuestionInput({
  onSubmit,
  busy,
  placeholder = 'Type your question here…'
}: QuestionInputProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onSubmit(text);
    setValue('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-xl border border-line bg-surface p-4">
      
      <label htmlFor="compliance-question" className="sr-only">
        Ask a compliance question
      </label>
      <textarea
        id="compliance-question"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="w-full resize-none rounded-lg border border-line bg-panel px-3 py-2.5 text-xs leading-relaxed text-ink placeholder:text-faint focus:border-brand/50 focus:outline-none" />
      
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="text-2xs text-faint">
          Answers come from local documents. Always verify with official sources.
        </p>
        <Button
          type="submit"
          disabled={!value.trim() || busy}
          icon={<SendIcon className="h-4 w-4" />}>
          
          {busy ? 'Searching…' : 'Ask'}
        </Button>
      </div>
    </form>);

}