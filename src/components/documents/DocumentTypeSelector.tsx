import {
  FileSignatureIcon,
  FileTextIcon,
  MailIcon,
  ReceiptIcon,
  SendIcon,
  StickyNoteIcon } from
'lucide-react';
import type { DocumentKind } from '../../types';

const KINDS: Array<{kind: DocumentKind;icon: React.ReactNode;}> = [
{ kind: 'Quotation', icon: <FileTextIcon className="h-4 w-4" /> },
{ kind: 'Invoice', icon: <FileSignatureIcon className="h-4 w-4" /> },
{ kind: 'Receipt', icon: <ReceiptIcon className="h-4 w-4" /> },
{ kind: 'Supplier Letter', icon: <SendIcon className="h-4 w-4" /> },
{ kind: 'Customer Letter', icon: <MailIcon className="h-4 w-4" /> },
{ kind: 'Other', icon: <StickyNoteIcon className="h-4 w-4" /> }];


interface DocumentTypeSelectorProps {
  value: DocumentKind;
  onChange: (kind: DocumentKind) => void;
}

export function DocumentTypeSelector({
  value,
  onChange
}: DocumentTypeSelectorProps) {
  return (
    <div className="rounded-xl border border-line bg-surface">
      <div className="border-b border-hairline px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
          Document Type
        </h2>
      </div>
      <ul className="p-2" role="listbox" aria-label="Document type">
        {KINDS.map(({ kind, icon }) => {
          const active = value === kind;
          return (
            <li key={kind}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onChange(kind)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors duration-150 ease-out ${
                active ?
                'bg-brand/15 font-medium text-brand-bright' :
                'text-muted hover:bg-raised hover:text-ink'}`
                }>
                
                <span className="shrink-0">{icon}</span>
                {kind}
              </button>
            </li>);

        })}
      </ul>
    </div>);

}