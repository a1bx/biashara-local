import React from 'react';
import { CheckIcon, LaptopIcon, XIcon } from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';

const DOES = [
'Parses M-Pesa statements and calculates income, expenses and cash flow',
'Ranks counterparties and shows month-on-month trends',
'Drafts quotations, invoices, receipts and business letters',
'Answers Kenyan compliance questions with a citation to a local source'];


const DOES_NOT = [
'Bookkeeping, ledgers or double-entry accounting',
'Tax filing or online submissions to KRA',
'Cloud synchronisation, user accounts or a mobile app',
'Live tax lookups — guidance reflects the local snapshot date'];


export function About() {
  return (
    <div className="mx-auto w-full max-w-[900px] space-y-4 px-6 py-5">
      <Card>
        <div className="flex items-start gap-4 px-5 py-5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand text-lg font-bold text-canvas"
            aria-hidden="true">
            
            B
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Biashara Local</h2>
            <p className="mt-1 text-xs text-muted">
              Offline business assistant for Kenyan SMEs · Version 1.0.0
            </p>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted">
              Biashara Local runs entirely on your computer. It helps you
              understand your M-Pesa statements, draft business documents and
              get grounded answers about Kenyan business compliance — without
              sending your business data anywhere.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="What it does" />
          <ul className="space-y-2.5 px-5 py-4">
            {DOES.map((item) =>
            <li key={item} className="flex gap-2.5 text-xs leading-relaxed text-muted">
                <CheckIcon
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                aria-hidden="true" />
              
                {item}
              </li>
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader title="What it is not" />
          <ul className="space-y-2.5 px-5 py-4">
            {DOES_NOT.map((item) =>
            <li key={item} className="flex gap-2.5 text-xs leading-relaxed text-muted">
                <XIcon
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-expense"
                aria-hidden="true" />
              
                {item}
              </li>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-4 px-5 py-4">
          <LaptopIcon className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium text-ink">
              Everything runs locally. Your business data stays on this device.
            </p>
            <p className="mt-1 text-2xs text-muted">
              Statement parsing, arithmetic and document totals are computed by
              code. The on-device model only explains figures it was given.
            </p>
          </div>
        </div>
      </Card>
    </div>);

}