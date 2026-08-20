import React from 'react';
import type { BusinessDocument } from '../../types';
import { isLetter } from '../../services/documentGenerator';
import { formatAmount, formatDate } from '../../utils/format';

export function DocumentPreview({ doc }: {doc: BusinessDocument;}) {
  return (
    <article className="rounded-lg border border-line bg-white p-8 text-[#111827]">
      <header className="flex items-start justify-between gap-6 border-b border-[#e5e7eb] pb-5">
        <div>
          <h3 className="text-lg font-bold">{doc.business.name}</h3>
          <p className="mt-1 whitespace-pre-line text-xs text-[#4b5563]">
            {doc.business.address}
          </p>
          <p className="mt-1 text-xs text-[#4b5563]">
            KRA PIN: {doc.business.kraPin || '—'}
          </p>
          <p className="text-xs text-[#4b5563]">
            {doc.business.phone} · {doc.business.email}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-wide">{doc.kind}</p>
          <p className="mt-1 text-xs text-[#4b5563]">{doc.reference}</p>
          <p className="text-xs text-[#4b5563]">{formatDate(doc.createdAt)}</p>
        </div>
      </header>

      <section className="py-5">
        <p className="text-2xs font-semibold uppercase tracking-wide text-[#6b7280]">
          {isLetter(doc.kind) ? 'To' : 'Bill To'}
        </p>
        <p className="mt-1 text-sm font-medium">{doc.customer.name || '—'}</p>
        <p className="text-xs text-[#4b5563]">{doc.customer.address}</p>
        <p className="text-xs text-[#4b5563]">
          {[doc.customer.phone, doc.customer.email].filter(Boolean).join(' · ')}
        </p>
      </section>

      {isLetter(doc.kind) ?
      <section className="whitespace-pre-line border-t border-[#e5e7eb] pt-5 text-xs leading-relaxed">
          {doc.body || 'No message written yet.'}
        </section> :

      <section className="border-t border-[#e5e7eb] pt-5">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-2xs uppercase tracking-wide text-[#6b7280]">
                <th scope="col" className="py-2 font-semibold">Description</th>
                <th scope="col" className="w-16 py-2 text-right font-semibold">Qty</th>
                <th scope="col" className="w-28 py-2 text-right font-semibold">Unit Price</th>
                <th scope="col" className="w-28 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item) =>
            <tr key={item.id} className="border-b border-[#f3f4f6]">
                  <td className="py-2">{item.description || '—'}</td>
                  <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatAmount(item.unitPrice)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatAmount(item.quantity * item.unitPrice)}
                  </td>
                </tr>
            )}
            </tbody>
          </table>

          <dl className="ml-auto mt-4 w-full max-w-[240px] space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-[#4b5563]">Subtotal</dt>
              <dd className="tabular-nums">KES {formatAmount(doc.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#4b5563]">
                VAT ({Math.round(doc.vatRate * 100)}%)
              </dt>
              <dd className="tabular-nums">KES {formatAmount(doc.vat)}</dd>
            </div>
            <div className="flex justify-between border-t border-[#e5e7eb] pt-1.5 font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">KES {formatAmount(doc.total)}</dd>
            </div>
          </dl>

          {doc.body ?
        <p className="mt-5 whitespace-pre-line border-t border-[#e5e7eb] pt-4 text-xs leading-relaxed text-[#4b5563]">
              {doc.body}
            </p> :
        null}
        </section>
      }

      <footer className="mt-6 border-t border-[#e5e7eb] pt-3 text-2xs text-[#6b7280]">
        Generated locally with Biashara Local · {doc.reference}
      </footer>
    </article>);

}