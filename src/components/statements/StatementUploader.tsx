import { useRef, useState } from 'react';
import { AlertTriangleIcon, UploadCloudIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  PARSE_STAGES,
  StatementParseError,
  SUPPORTED_HEADERS,
  parseMpesaCsv } from
'../../services/statementParser';
import { Button } from '../common/Button';
import { LoadingState } from '../common/LoadingState';
import { Modal } from '../common/Modal';

interface StatementUploaderProps {
  onParsed: (statementId: string) => void;
}

interface ParseFailure {
  title: string;
  hint: string;
}

export function StatementUploader({ onParsed }: StatementUploaderProps) {
  const { addStatement } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState(-1);
  const [failure, setFailure] = useState<ParseFailure | null>(null);
  const [showFormats, setShowFormats] = useState(false);

  const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

  const handleFile = async (file: File) => {
    setFailure(null);
    setStage(0);

    if (/\.pdf$/i.test(file.name)) {
      await wait(500);
      setStage(-1);
      setFailure({
        title: "We couldn't read this statement",
        hint: 'PDF extraction is handled by the local statement service, which is not available in this preview. Export your statement as CSV from M-Pesa and try again.'
      });
      return;
    }

    if (!/\.csv$/i.test(file.name)) {
      await wait(300);
      setStage(-1);
      setFailure({
        title: "We couldn't read this statement",
        hint: "The file format doesn't appear to match a supported M-Pesa statement export."
      });
      return;
    }

    try {
      const text = await file.text();
      await wait(400);
      setStage(1);
      const statement = parseMpesaCsv(text, file.name);
      await wait(400);
      setStage(2);
      await wait(350);
      setStage(3);
      await wait(400);
      setStage(4);
      addStatement(statement);
      await wait(350);
      setStage(-1);
      onParsed(statement.id);
    } catch (error) {
      setStage(-1);
      if (error instanceof StatementParseError) {
        setFailure({ title: error.message, hint: error.hint });
      } else {
        setFailure({
          title: "We couldn't read this statement",
          hint: 'Something went wrong while reading the file on this device. Try another file.'
        });
      }
    }
  };

  if (stage >= 0) {
    return (
      <div className="rounded-xl border border-line bg-surface">
        <LoadingState
          stages={PARSE_STAGES}
          currentStage={stage}
          title="Parsing statement" />
        
      </div>);

  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
        1. Upload Statement
      </h2>

      {failure ?
      <div className="mt-3 rounded-lg border border-expense/30 bg-expense/5 p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-expense">
            <AlertTriangleIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {failure.title}
          </p>
          <p className="mt-1.5 text-2xs leading-relaxed text-muted">
            {failure.hint}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              Try another file
            </Button>
            <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowFormats(true)}>
            
              View supported formats
            </Button>
          </div>
        </div> :

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={`mt-3 rounded-lg border border-dashed p-6 text-center transition-colors duration-150 ease-out ${
        dragging ? 'border-brand bg-brand/5' : 'border-line bg-panel'}`
        }>
        
          <UploadCloudIcon
          className="mx-auto h-6 w-6 text-faint"
          aria-hidden="true" />
        
          <p className="mt-2 text-xs text-ink">Drop CSV or PDF here</p>
          <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-0.5 text-2xs text-brand-bright underline-offset-2 hover:underline">
          
            or click to browse
          </button>
        </div>
      }

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.pdf"
        className="sr-only"
        aria-label="Choose a statement file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }} />
      

      <p className="mt-3 text-2xs text-faint">
        Supported: M-Pesa CSV / PDF exports. Files are read on this device only.
      </p>

      <Modal
        open={showFormats}
        title="Supported statement formats"
        subtitle="Everything is parsed locally by a deterministic reader."
        onClose={() => setShowFormats(false)}
        width="max-w-lg"
        footer={
        <Button variant="secondary" onClick={() => setShowFormats(false)}>
            Close
          </Button>
        }>
        
        <p className="text-xs leading-relaxed text-muted">
          Export your M-Pesa statement as CSV from the Safaricom statement email
          or the M-Pesa app. The reader looks for a header row containing these
          columns (extra columns are ignored):
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {SUPPORTED_HEADERS.map((header) =>
          <li
            key={header}
            className="rounded-md border border-line bg-panel px-2.5 py-1.5 font-mono text-2xs text-ink">
            
              {header}
            </li>
          )}
        </ul>
        <p className="mt-3 text-2xs leading-relaxed text-faint">
          Dates may be formatted as 2026-07-15 14:32:11 or 15/07/2026 14:32.
        </p>
      </Modal>
    </div>);

}