import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CpuIcon, SendIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { detectIntent } from '../../services/complianceRetrieval';
import {
  answerBusinessQuestion,
  type BusinessDataAnswer } from
'../../services/narrative';
import { Button } from '../common/Button';
import { Card, CardHeader } from '../common/Card';

const EXAMPLES = [
'What were my top expenses last month?',
'What is the VAT registration threshold?',
'Which customers paid me the most?'];


export function AskQuestion() {
  const navigate = useNavigate();
  const { latestStatement } = useApp();
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [answer, setAnswer] = useState<BusinessDataAnswer | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const submit = (value: string) => {
    const text = value.trim();
    if (!text) return;
    const intent = detectIntent(text);

    if (intent === 'compliance') {
      navigate('/compliance', { state: { question: text } });
      return;
    }
    if (intent === 'document') {
      navigate('/documents');
      return;
    }
    if (intent === 'unsupported' || !latestStatement) {
      setAnswer(null);
      setUnsupported(true);
      return;
    }

    setUnsupported(false);
    setThinking(true);
    setAnswer(null);
    window.setTimeout(() => {
      setAnswer(
        answerBusinessQuestion(
          text,
          latestStatement.transactions,
          latestStatement.periodLabel
        )
      );
      setThinking(false);
    }, 450);
  };

  return (
    <Card>
      <CardHeader
        title="Ask a question"
        subtitle="Ask anything about your business or compliance." />
      
      <div className="px-5 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(question);
          }}>
          
          <label htmlFor="dashboard-question" className="sr-only">
            Type your question
          </label>
          <textarea
            id="dashboard-question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(question);
              }
            }}
            placeholder="Type your question here…"
            className="w-full resize-none rounded-lg border border-line bg-panel px-3 py-2.5 text-xs leading-relaxed text-ink placeholder:text-faint focus:border-brand/50 focus:outline-none" />
          
          <div className="mt-2 flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!question.trim() || thinking}
              icon={<SendIcon className="h-3.5 w-3.5" />}>
              
              {thinking ? 'Thinking…' : 'Ask'}
            </Button>
          </div>
        </form>

        {thinking ?
        <p className="mt-3 text-2xs text-faint" role="status">
            Routing your question through the local assistant…
          </p> :
        null}

        {unsupported ?
        <div className="mt-3 rounded-lg border border-warn/25 bg-warn/5 p-3">
            <p className="text-xs font-medium text-warn">
              I don&apos;t have enough information to answer that confidently.
            </p>
            <p className="mt-1 text-2xs leading-relaxed text-muted">
              Try asking about M-Pesa transactions, business documents, eTIMS,
              VAT or turnover tax.
            </p>
          </div> :
        null}

        {answer ?
        <div className="mt-3 rounded-lg border border-line bg-panel p-3">
            <p className="text-xs leading-relaxed text-ink">{answer.summary}</p>
            <ul className="mt-2 space-y-1">
              {answer.bullets.map((bullet) =>
            <li
              key={bullet}
              className="flex gap-2 text-2xs leading-relaxed text-muted">
              
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                  {bullet}
                </li>
            )}
            </ul>
            <p className="mt-2.5 flex items-center gap-1.5 border-t border-hairline pt-2 text-2xs text-faint">
              <CpuIcon className="h-3 w-3" aria-hidden="true" />
              {answer.basis}
            </p>
          </div> :
        null}

        <p className="mt-4 text-2xs text-faint">Examples:</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) =>
          <button
            key={example}
            type="button"
            onClick={() => {
              setQuestion(example);
              submit(example);
            }}
            className="rounded-md border border-line bg-panel px-2 py-1 text-2xs text-muted transition-colors duration-150 ease-out hover:border-brand/40 hover:text-brand-bright">
            
              {example}
            </button>
          )}
        </div>
      </div>
    </Card>);

}