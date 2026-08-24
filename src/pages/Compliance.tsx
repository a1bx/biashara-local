import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircleIcon, LibraryIcon } from 'lucide-react';
import { AnswerCard } from '../components/compliance/AnswerCard';
import { QuestionInput } from '../components/compliance/QuestionInput';
import { Button } from '../components/common/Button';
import { Card, CardHeader } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { Modal } from '../components/common/Modal';
import { corpus, corpusMeta } from '../data/corpus';
import { useApp } from '../contexts/AppContext';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { useRetrievalHealth } from '../hooks/useRetrievalHealth';
import {
  SAMPLE_QUESTIONS,
  answerComplianceAsync,
  retrieve,
} from '../services/complianceRetrieval';
import { generateStream } from '../services/inference';

const STAGES = [
'Searching local knowledge base…',
'Reading matching sources…',
'Drafting a grounded answer…',
'Complete'] as
const;

export function Compliance() {
  const navigate = useNavigate();
  const location = useLocation();
  const { history, addAnswer, clearHistory } = useApp();
  const { health } = useBackendHealth();
  const retrievalHealth = useRetrievalHealth();
  const [stage, setStage] = useState(-1);
  const [streaming, setStreaming] = useState<{question: string;text: string;} | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const handled = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const askWithFallback = async (question: string) => {
    setStage(0);
    await new Promise((r) => window.setTimeout(r, 320));
    setStage(1);
    await new Promise((r) => window.setTimeout(r, 320));
    setStage(2);
    addAnswer(await answerComplianceAsync(question));
    setStage(-1);
  };

  const askWithModel = async (question: string) => {
    const matches = (await retrieve(question)).slice(0, 3);
    if (matches.length === 0) {
      addAnswer(await answerComplianceAsync(question));
      return;
    }
    const best = matches[0];

    setStage(0);
    await new Promise((r) => window.setTimeout(r, 200));
    setStage(1);
    await new Promise((r) => window.setTimeout(r, 200));
    setStage(2);
    setStreaming({ question, text: '' });

    const context = matches.
    map((m, i) => `[${i + 1}] ${m.doc.title} - ${m.chunk.heading}\n${m.chunk.text}`).
    join('\n\n');
    const prompt =
    `You are a careful assistant for a small business owner in Kenya. ` +
    `Answer the QUESTION using ONLY the CONTEXT below, in 2 to 4 short sentences. ` +
    `If the context does not contain the answer, say so honestly.\n\n` +
    `CONTEXT:\n${context}\n\n` +
    `QUESTION: ${question}\n\n` +
    `ANSWER:`;

    abortRef.current = new AbortController();
    let full = '';
    try {
      for await (const evt of generateStream(prompt, {
        maxTokens: 220,
        temperature: 0.2,
        stop: ['\nQUESTION:', '\nCONTEXT:'],
        signal: abortRef.current.signal
      })) {
        if (evt.type === 'token') {
          full += evt.text;
          setStreaming({ question, text: full });
        }
        if (evt.type === 'error') throw new Error(evt.message);
      }

      const summary = full.trim() || best.chunk.text;
      addAnswer({
        id: `ans-${Date.now()}`,
        question,
        summary,
        bullets: best.chunk.bullets,
        sourceTitle: best.doc.title,
        sourceId: best.doc.id,
        sourceSnapshot: best.doc.snapshot,
        sourceHeading: best.chunk.heading,
        confident: true,
        followUps: best.chunk.followUps,
        askedAt: new Date().toISOString()
      });
    } catch {
      addAnswer(await answerComplianceAsync(question));
    } finally {
      abortRef.current = null;
      setStreaming(null);
      setStage(-1);
    }
  };

  const ask = (question: string) => {
    if (health?.ok) {
      void askWithModel(question);
      return;
    }
    void askWithFallback(question);
  };

  useEffect(() => {
    const state = location.state as {question?: string;} | null;
    if (state?.question && !handled.current) {
      handled.current = true;
      ask(state.question);
      navigate('.', { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const source = corpus.find((doc) => doc.id === sourceId) ?? null;
  const busy = stage >= 0;

  return (
    <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-4 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">Compliance Q&A</h2>
            {retrievalHealth?.ok ? (
              <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-2xs font-medium text-brand-bright">
                index: {retrievalHealth.chunkCount} sections
              </span>
            ) : (
              <span className="rounded-full border border-line bg-panel px-2 py-0.5 text-2xs text-muted">
                index offline · local fallback
              </span>
            )}
            {health?.ok ? (
              <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-2xs font-medium text-brand-bright">
                on-device model: {health.modelPath}
              </span>
            ) : (
              <span className="rounded-full border border-line bg-panel px-2 py-0.5 text-2xs text-muted">
                model offline · retrieval only
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Get grounded answers about Kenyan business requirements.
          </p>
        </div>

        <QuestionInput onSubmit={ask} busy={busy} />

        {busy ?
        <Card>
            <LoadingState
            stages={STAGES}
            currentStage={stage}
            title="Answering from local documents"
            note="Retrieval and generation run on this device." />
            {streaming && streaming.text ?
          <div className="border-t border-line px-5 pb-5 pt-4">
                <p className="text-2xs font-semibold uppercase tracking-wide text-faint">
                  Streaming
                </p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink">
                  {streaming.text}
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-brand align-middle" />
                </p>
              </div> :
          null}
          </Card> :
        null}

        {history.length === 0 && !busy ?
        <Card>
            <EmptyState
            icon={<HelpCircleIcon className="h-5 w-5" />}
            title="No compliance questions yet"
            description="Ask a question about Kenyan tax and business compliance. Answers are retrieved from the curated corpus stored on this device."
            actionLabel="Ask a Question"
            onAction={() =>
            document.getElementById('compliance-question')?.focus()
            } />

          </Card> :
        null}

        <div className="space-y-5">
          {history.map((answer) =>
          <AnswerCard
            key={answer.id}
            answer={answer}
            onFollowUp={ask}
            onViewSource={setSourceId} />

          )}
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Try asking"
            subtitle="Questions the local corpus can answer well." />

          <ul className="space-y-1.5 p-3">
            {SAMPLE_QUESTIONS.map((question) =>
            <li key={question}>
                <button
                type="button"
                onClick={() => ask(question)}
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-left text-2xs text-muted transition-colors duration-150 ease-out hover:border-brand/40 hover:text-brand-bright">

                  {question}
                </button>
              </li>
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Local corpus"
            subtitle={`${corpusMeta.docCount} documents · ${corpusMeta.chunkCount} indexed sections`}
          />
          <div className="p-4">
            <p className="text-2xs leading-relaxed text-muted">
              Every answer cites the document it came from. Nothing is fetched
              from the internet, so guidance reflects the snapshot date shown on
              each source.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<LibraryIcon className="h-3.5 w-3.5" />}
                onClick={() => navigate('/knowledge-base')}>

                Knowledge Base
              </Button>
              {history.length > 0 ?
              <Button size="sm" variant="ghost" onClick={clearHistory}>
                  Clear history
                </Button> :
              null}
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={source !== null}
        title={source?.title ?? 'Source'}
        subtitle={
        source ? `${source.docType} · snapshot ${source.snapshot}` : undefined
        }
        onClose={() => setSourceId(null)}>

        <div className="space-y-4">
          {source?.chunks.map((chunk) =>
          <section key={chunk.id}>
              <h3 className="text-xs font-semibold text-ink">{chunk.heading}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                {chunk.text}
              </p>
              <ul className="mt-2 space-y-1">
                {chunk.bullets.map((bullet) =>
              <li
                key={bullet}
                className="flex gap-2 text-2xs leading-relaxed text-faint">

                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                    {bullet}
                  </li>
              )}
              </ul>
            </section>
          )}
        </div>
      </Modal>
    </div>);

}
