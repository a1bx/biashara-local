import type { DocumentKind, LineItem } from '../types';

/** Deterministic document arithmetic — never delegated to the language model. */

export const VAT_RATE = 0.16;

export interface DocumentTotals {
  subtotal: number;
  vat: number;
  total: number;
}

export function lineAmount(item: LineItem): number {
  return Math.round(item.quantity * item.unitPrice * 100) / 100;
}

export function computeDocumentTotals(
items: LineItem[],
vatRate = VAT_RATE)
: DocumentTotals {
  const subtotal = items.reduce((sum, item) => sum + lineAmount(item), 0);
  const vat = Math.round(subtotal * vatRate * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vat,
    total: Math.round((subtotal + vat) * 100) / 100
  };
}

const PREFIX: Record<DocumentKind, string> = {
  Quotation: 'QUO',
  Invoice: 'INV',
  Receipt: 'RCP',
  'Supplier Letter': 'SLT',
  'Customer Letter': 'CLT',
  Other: 'DOC'
};

export function nextReference(kind: DocumentKind, existing: number): string {
  const year = new Date().getFullYear();
  return `${PREFIX[kind]}-${year}-${`${existing + 1}`.padStart(3, '0')}`;
}

export function isLetter(kind: DocumentKind): boolean {
  return kind === 'Supplier Letter' || kind === 'Customer Letter' || kind === 'Other';
}

export function categoryForKind(
kind: DocumentKind)
: 'Invoices' | 'Quotations' | 'Receipts' | 'Letters' {
  if (kind === 'Invoice') return 'Invoices';
  if (kind === 'Quotation') return 'Quotations';
  if (kind === 'Receipt') return 'Receipts';
  return 'Letters';
}