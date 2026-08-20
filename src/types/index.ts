export type TransactionType =
'Received' |
'Sent' |
'Withdrawal' |
'Deposit' |
'Payment';

export type Direction = 'in' | 'out';

export interface Transaction {
  id: string;
  receipt: string;
  date: string; // ISO yyyy-mm-dd
  time: string; // HH:mm
  description: string;
  counterparty: string;
  type: TransactionType;
  direction: Direction;
  amount: number;
  balance: number;
}

export interface Statement {
  id: string;
  name: string;
  periodLabel: string; // e.g. "Jul 2026"
  fileName: string;
  importedAt: string; // ISO datetime
  status: 'Parsed' | 'Failed';
  transactions: Transaction[];
}

export interface CounterpartyStat {
  name: string;
  count: number;
  moneyIn: number;
  moneyOut: number;
  net: number;
  volume: number;
  share: number;
}

export interface MonthlyStat {
  key: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
  count: number;
}

export interface Totals {
  income: number;
  expenses: number;
  net: number;
  count: number;
  avgPerDay: number;
  mostActiveDay: string | null;
  mostActiveDayCount: number;
}

export type DocumentKind =
'Quotation' |
'Invoice' |
'Receipt' |
'Supplier Letter' |
'Customer Letter' |
'Other';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface BusinessProfile {
  name: string;
  address: string;
  kraPin: string;
  phone: string;
  email: string;
}

export interface PartyDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface BusinessDocument {
  id: string;
  reference: string;
  kind: DocumentKind;
  business: BusinessProfile;
  customer: PartyDetails;
  items: LineItem[];
  body: string;
  vatRate: number;
  subtotal: number;
  vat: number;
  total: number;
  createdAt: string;
  modifiedAt: string;
  status: 'Draft' | 'Final';
}

export type StoredFileCategory =
'Statements' |
'Invoices' |
'Quotations' |
'Receipts' |
'Letters' |
'Compliance Sources';

export interface StoredFile {
  id: string;
  name: string;
  category: StoredFileCategory;
  type: string;
  createdAt: string;
  modifiedAt: string;
  status: string;
  linkTo?: string;
}

export interface CorpusChunk {
  id: string;
  heading: string;
  text: string;
  keywords: string[];
  bullets: string[];
  followUps: string[];
}

export interface CorpusDocument {
  id: string;
  title: string;
  category: string;
  docType: string;
  snapshot: string;
  status: 'Indexed' | 'Pending';
  chunks: CorpusChunk[];
}

export interface ComplianceAnswer {
  id: string;
  question: string;
  summary: string;
  bullets: string[];
  sourceTitle: string;
  sourceId: string;
  sourceSnapshot: string;
  sourceHeading: string;
  confident: boolean;
  followUps: string[];
  askedAt: string;
}