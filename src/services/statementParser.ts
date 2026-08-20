import type { Statement, Transaction, TransactionType } from '../types';

/**
 * Deterministic M-Pesa statement parser. Runs entirely on device.
 * No arithmetic here is ever delegated to the language model.
 */

export class StatementParseError extends Error {
  readonly hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.name = 'StatementParseError';
    this.hint = hint;
  }
}

export const SUPPORTED_HEADERS = [
'Receipt No.',
'Completion Time',
'Details',
'Transaction Status',
'Paid In',
'Withdrawn',
'Balance'];


function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function toNumber(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function parseDateTime(value: string): {date: string;time: string;} | null {
  const trimmed = value.trim();
  // 2026-07-15 14:32:11
  let match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/
  );
  if (match) {
    return {
      date: `${match[1]}-${match[2]}-${match[3]}`,
      time: `${match[4].padStart(2, '0')}:${match[5]}`
    };
  }
  // 15/07/2026 14:32
  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})/);
  if (match) {
    return {
      date: `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`,
      time: `${match[4].padStart(2, '0')}:${match[5]}`
    };
  }
  match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return { date: trimmed, time: '00:00' };
  return null;
}

function detectCounterparty(details: string): string {
  const cleaned = details.
  replace(/^[A-Z0-9]{8,12}\s*-\s*/, '').
  replace(
    /^(Customer Transfer (Fuliza MPesa )?to|Customer Transfer of Funds Charge|Pay Bill (Online|Charge)?( to)?|Merchant Payment( to)?|Funds received from|Business Payment from|Customer Payment to Small Business|Buy Goods( Online)?( to)?|Withdrawal Charge|Deposit of Funds at Agent Till|Withdrawal at Agent Till)\s*/i,
    ''
  ).
  replace(/\b\d{5,}\b/g, '').
  replace(/\s*-\s*$/, '').
  replace(/\s{2,}/g, ' ').
  trim();
  if (!cleaned) return 'Unknown';
  return cleaned.
  split(' ').
  slice(0, 5).
  join(' ').
  replace(/[,.]$/, '');
}

function detectType(details: string, direction: 'in' | 'out'): TransactionType {
  const lower = details.toLowerCase();
  if (lower.includes('withdraw')) return 'Withdrawal';
  if (lower.includes('deposit')) return 'Deposit';
  if (direction === 'in') return 'Received';
  if (lower.includes('pay bill') || lower.includes('merchant') || lower.includes('buy goods'))
  return 'Payment';
  return 'Sent';
}

function findIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) =>
  candidates.some((c) => h.toLowerCase().includes(c))
  );
}

export function parseMpesaCsv(text: string, fileName: string): Statement {
  const lines = text.
  split(/\r?\n/).
  map((l) => l.trim()).
  filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new StatementParseError(
      "We couldn't read this statement",
      'The file appears to be empty or has no transaction rows.'
    );
  }

  const headerIndex = lines.findIndex((line) => {
    const lower = line.toLowerCase();
    return (
      (lower.includes('receipt') || lower.includes('transaction')) && (
      lower.includes('paid in') || lower.includes('amount')) &&
      lower.includes('balance'));

  });

  if (headerIndex === -1) {
    throw new StatementParseError(
      "We couldn't read this statement",
      "The file format doesn't appear to match a supported M-Pesa statement export."
    );
  }

  const headers = splitCsvLine(lines[headerIndex]);
  const iReceipt = findIndex(headers, ['receipt', 'transaction id']);
  const iTime = findIndex(headers, ['completion time', 'date', 'time']);
  const iDetails = findIndex(headers, ['details', 'description', 'narrative']);
  const iPaidIn = findIndex(headers, ['paid in', 'money in', 'credit']);
  const iWithdrawn = findIndex(headers, ['withdrawn', 'money out', 'debit']);
  const iAmount = findIndex(headers, ['amount']);
  const iBalance = findIndex(headers, ['balance']);
  const iStatus = findIndex(headers, ['status']);

  if (iTime === -1 || iBalance === -1 || iPaidIn === -1 && iAmount === -1) {
    throw new StatementParseError(
      "We couldn't read this statement",
      "The file is missing the columns we expect from an M-Pesa export (completion time, amount and balance)."
    );
  }

  const transactions: Transaction[] = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length < 3) continue;
    if (iStatus !== -1 && cells[iStatus] && /fail|cancel/i.test(cells[iStatus]))
    continue;

    const stamp = parseDateTime(cells[iTime] ?? '');
    if (!stamp) continue;

    const paidIn = iPaidIn !== -1 ? toNumber(cells[iPaidIn] ?? '') : 0;
    const withdrawn = iWithdrawn !== -1 ? toNumber(cells[iWithdrawn] ?? '') : 0;
    let amount = paidIn || withdrawn;
    let direction: 'in' | 'out' = paidIn > 0 ? 'in' : 'out';

    if (!amount && iAmount !== -1) {
      const rawAmount = cells[iAmount] ?? '';
      amount = toNumber(rawAmount);
      direction = rawAmount.trim().startsWith('-') ? 'out' : 'in';
    }
    if (!amount) continue;

    const details = cells[iDetails] ?? '';
    transactions.push({
      id: `${fileName}-${i}`,
      receipt: (cells[iReceipt] ?? `TX${i}`).toUpperCase(),
      date: stamp.date,
      time: stamp.time,
      description: details || 'M-Pesa transaction',
      counterparty: detectCounterparty(details),
      type: detectType(details, direction),
      direction,
      amount,
      balance: toNumber(cells[iBalance] ?? '')
    });
  }

  if (transactions.length === 0) {
    throw new StatementParseError(
      "We couldn't read this statement",
      'We found the columns but no readable transaction rows in this file.'
    );
  }

  transactions.sort((a, b) =>
  `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );

  const first = transactions[0].date;
  const last = transactions[transactions.length - 1].date;
  const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const label = (iso: string): string => {
    const [y, m] = iso.split('-');
    return `${months[Number(m) - 1]} ${y}`;
  };
  const periodLabel =
  label(first) === label(last) ? label(first) : `${label(first)} – ${label(last)}`;

  return {
    id: `stmt-${Date.now()}`,
    name: `M-Pesa Statement — ${periodLabel}`,
    periodLabel,
    fileName,
    importedAt: new Date().toISOString(),
    status: 'Parsed',
    transactions
  };
}

export const PARSE_STAGES = [
'Reading statement…',
'Extracting transactions…',
'Calculating totals…',
'Generating summary…',
'Complete'] as
const;