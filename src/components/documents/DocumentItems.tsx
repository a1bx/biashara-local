import { PlusIcon, Trash2Icon } from 'lucide-react';
import type { LineItem } from '../../types';
import {
  computeDocumentTotals,
  lineAmount,
  VAT_RATE } from
'../../services/documentGenerator';
import { formatAmount } from '../../utils/format';

interface DocumentItemsProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

export function DocumentItems({ items, onChange }: DocumentItemsProps) {
  const totals = computeDocumentTotals(items);

  const update = (id: string, patch: Partial<LineItem>) =>
  onChange(items.map((item) => item.id === id ? { ...item, ...patch } : item));

  const cell =
  'w-full rounded-md border border-line bg-panel px-2 py-1.5 text-xs text-ink placeholder:text-faint focus:border-brand/50 focus:outline-none';

  return (
    <fieldset>
      <legend className="mb-2.5 text-xs font-semibold text-ink">3. Items</legend>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <caption className="sr-only">Line items for this document</caption>
          <thead className="bg-panel">
            <tr className="text-2xs uppercase tracking-wide text-faint">
              <th scope="col" className="px-3 py-2 font-medium">Item Description</th>
              <th scope="col" className="w-20 px-3 py-2 font-medium">Qty</th>
              <th scope="col" className="w-32 px-3 py-2 font-medium">Unit Price (KES)</th>
              <th scope="col" className="w-32 px-3 py-2 text-right font-medium">Amount (KES)</th>
              <th scope="col" className="w-12 px-3 py-2">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {items.map((item, index) =>
            <tr key={item.id}>
                <td className="px-3 py-2">
                  <label className="sr-only" htmlFor={`desc-${item.id}`}>
                    Item {index + 1} description
                  </label>
                  <input
                  id={`desc-${item.id}`}
                  className={cell}
                  value={item.description}
                  placeholder="e.g. Wireless router installation"
                  onChange={(e) => update(item.id, { description: e.target.value })} />
                
                </td>
                <td className="px-3 py-2">
                  <label className="sr-only" htmlFor={`qty-${item.id}`}>
                    Item {index + 1} quantity
                  </label>
                  <input
                  id={`qty-${item.id}`}
                  type="number"
                  min={0}
                  className={`${cell} tabular-nums`}
                  value={item.quantity}
                  onChange={(e) =>
                  update(item.id, { quantity: Number(e.target.value) || 0 })
                  } />
                
                </td>
                <td className="px-3 py-2">
                  <label className="sr-only" htmlFor={`price-${item.id}`}>
                    Item {index + 1} unit price
                  </label>
                  <input
                  id={`price-${item.id}`}
                  type="number"
                  min={0}
                  className={`${cell} tabular-nums`}
                  value={item.unitPrice}
                  onChange={(e) =>
                  update(item.id, { unitPrice: Number(e.target.value) || 0 })
                  } />
                
                </td>
                <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-ink">
                  {formatAmount(lineAmount(item))}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                  type="button"
                  aria-label={`Remove item ${index + 1}`}
                  onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                  className="rounded-md p-1 text-faint transition-colors duration-150 ease-out hover:bg-expense/10 hover:text-expense">
                  
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            )}
            {items.length === 0 ?
            <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-2xs text-faint">
                  No items yet. Add your first line item below.
                </td>
              </tr> :
            null}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <button
          type="button"
          onClick={() =>
          onChange([
          ...items,
          {
            id: `item-${Date.now()}`,
            description: '',
            quantity: 1,
            unitPrice: 0
          }]
          )
          }
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-bright transition-colors duration-150 ease-out hover:text-brand">
          
          <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Add Item
        </button>

        <dl className="w-full max-w-[260px] space-y-1.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums text-ink">{formatAmount(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">VAT ({Math.round(VAT_RATE * 100)}%)</dt>
            <dd className="tabular-nums text-ink">{formatAmount(totals.vat)}</dd>
          </div>
          <div className="flex justify-between border-t border-hairline pt-1.5">
            <dt className="font-medium text-ink">Total</dt>
            <dd className="font-semibold tabular-nums text-brand-bright">
              {formatAmount(totals.total)}
            </dd>
          </div>
        </dl>
      </div>
      <p className="mt-2 text-2xs text-faint">
        Totals are calculated on this device, not by the language model.
      </p>
    </fieldset>);

}