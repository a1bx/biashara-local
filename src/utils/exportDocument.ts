import type { BusinessDocument } from '../types';
import { isLetter } from '../services/documentGenerator';
import { formatAmount, formatDate } from './format';

/** Builds a self-contained HTML file for a generated document. No network use. */
export function documentToHtml(doc: BusinessDocument): string {
  const rows = doc.items.
  map(
    (item) => `<tr>
        <td>${escapeHtml(item.description)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatAmount(item.unitPrice)}</td>
        <td class="num">${formatAmount(item.quantity * item.unitPrice)}</td>
      </tr>`
  ).
  join('');

  const itemsBlock = isLetter(doc.kind) ?
  `<p class="body">${escapeHtml(doc.body).replace(/\n/g, '<br />')}</p>` :
  `<table>
        <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td class="num">KES ${formatAmount(doc.subtotal)}</td></tr>
        <tr><td>VAT (${Math.round(doc.vatRate * 100)}%)</td><td class="num">KES ${formatAmount(doc.vat)}</td></tr>
        <tr class="grand"><td>Total</td><td class="num">KES ${formatAmount(doc.total)}</td></tr>
      </table>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${escapeHtml(doc.kind)} ${escapeHtml(doc.reference)}</title>
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #111827; margin: 40px; }
  h1 { font-size: 18px; margin: 0; }
  .meta { text-align: right; }
  .row { display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
  th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #f3f4f6; }
  .num { text-align: right; }
  .totals { width: 260px; margin-left: auto; }
  .grand td { font-weight: 700; border-top: 1px solid #e5e7eb; }
  .body { font-size: 12px; line-height: 1.7; }
  footer { margin-top: 32px; font-size: 10px; color: #6b7280; }
</style></head>
<body>
  <div class="row">
    <div>
      <h1>${escapeHtml(doc.business.name)}</h1>
      <p>${escapeHtml(doc.business.address)}<br />KRA PIN: ${escapeHtml(doc.business.kraPin)}<br />${escapeHtml(doc.business.phone)} · ${escapeHtml(doc.business.email)}</p>
    </div>
    <div class="meta">
      <strong>${escapeHtml(doc.kind.toUpperCase())}</strong>
      <p>${escapeHtml(doc.reference)}<br />${formatDate(doc.createdAt)}</p>
    </div>
  </div>
  <p><strong>${isLetter(doc.kind) ? 'To' : 'Bill To'}:</strong><br />${escapeHtml(doc.customer.name)}<br />${escapeHtml(doc.customer.address)}</p>
  ${itemsBlock}
  <footer>Generated locally with Biashara Local · ${escapeHtml(doc.reference)}</footer>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value.
  replace(/&/g, '&amp;').
  replace(/</g, '&lt;').
  replace(/>/g, '&gt;').
  replace(/"/g, '&quot;');
}

export function downloadDocument(doc: BusinessDocument): void {
  const blob = new Blob([documentToHtml(doc)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${doc.kind.replace(/\s+/g, '-')}-${doc.reference}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printDocument(doc: BusinessDocument): void {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) return;
  win.document.open();
  win.document.write(documentToHtml(doc));
  win.document.close();
  win.focus();
  win.print();
  window.setTimeout(() => document.body.removeChild(frame), 1000);
}