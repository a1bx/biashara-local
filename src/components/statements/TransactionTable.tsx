import React, { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import type { Transaction, TransactionType } from '../../types';
import { formatAmount, formatDate } from '../../utils/format';
import { Badge, type BadgeTone } from '../common/Badge';
import { Button } from '../common/Button';
import { SearchInput } from '../common/SearchInput';

const TYPES: Array<TransactionType | 'All'> = [
'All',
'Received',
'Sent',
'Withdrawal',
'Deposit',
'Payment'];


const TYPE_TONE: Record<TransactionType, BadgeTone> = {
  Received: 'success',
  Deposit: 'brand',
  Sent: 'danger',
  Payment: 'warn',
  Withdrawal: 'neutral'
};

type SortKey = 'date' | 'amount' | 'counterparty';

const PAGE_SIZE = 12;

export function TransactionTable({
  transactions


}: {transactions: Transaction[];}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TransactionType | 'All'>('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = transactions.filter((t) => {
      if (type !== 'All' && t.type !== type) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (
      q &&
      !`${t.description} ${t.counterparty} ${t.receipt}`.
      toLowerCase().
      includes(q))

      return false;
      return true;
    });

    rows.sort((a, b) => {
      let result = 0;
      if (sortKey === 'date')
      result = `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);else
      if (sortKey === 'amount') result = a.amount - b.amount;else
      result = a.counterparty.localeCompare(b.counterparty);
      return sortAsc ? result : -result;
    });

    return rows;
  }, [transactions, query, type, from, to, sortKey, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((v) => !v);else
    {
      setSortKey(key);
      setSortAsc(key === 'counterparty');
    }
    setPage(0);
  };

  const SortHeader = ({ label, keyName }: {label: string;keyName: SortKey;}) =>
  <button
    type="button"
    onClick={() => toggleSort(keyName)}
    className="inline-flex items-center gap-1 text-2xs font-medium uppercase tracking-wide text-faint transition-colors duration-150 ease-out hover:text-ink"
    aria-label={`Sort by ${label}`}>
    
      {label}
      {sortKey === keyName ?
    sortAsc ?
    <ChevronUpIcon className="h-3 w-3" aria-hidden="true" /> :

    <ChevronDownIcon className="h-3 w-3" aria-hidden="true" /> :

    null}
    </button>;


  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          label="Search transactions"
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(0);
          }}
          placeholder="Search description, counterparty or ID…"
          className="min-w-[220px] flex-1" />
        
        <label className="sr-only" htmlFor="type-filter">
          Filter by type
        </label>
        <select
          id="type-filter"
          value={type}
          onChange={(e) => {
            setType(e.target.value as TransactionType | 'All');
            setPage(0);
          }}
          className="h-9 rounded-lg border border-line bg-panel px-2.5 text-xs text-ink focus:border-brand/50 focus:outline-none">
          
          {TYPES.map((t) =>
          <option key={t} value={t}>
              {t === 'All' ? 'All types' : t}
            </option>
          )}
        </select>
        <label className="sr-only" htmlFor="from-date">
          From date
        </label>
        <input
          id="from-date"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(0);
          }}
          className="h-9 rounded-lg border border-line bg-panel px-2.5 text-xs text-ink focus:border-brand/50 focus:outline-none" />
        
        <label className="sr-only" htmlFor="to-date">
          To date
        </label>
        <input
          id="to-date"
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(0);
          }}
          className="h-9 rounded-lg border border-line bg-panel px-2.5 text-xs text-ink focus:border-brand/50 focus:outline-none" />
        
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <caption className="sr-only">
            Parsed M-Pesa transactions for this statement
          </caption>
          <thead className="bg-panel">
            <tr>
              <th scope="col" className="px-3 py-2">
                <SortHeader label="Date" keyName="date" />
              </th>
              <th scope="col" className="px-3 py-2 text-2xs font-medium uppercase tracking-wide text-faint">
                Time
              </th>
              <th scope="col" className="px-3 py-2 text-2xs font-medium uppercase tracking-wide text-faint">
                Transaction ID
              </th>
              <th scope="col" className="px-3 py-2 text-2xs font-medium uppercase tracking-wide text-faint">
                Description
              </th>
              <th scope="col" className="px-3 py-2">
                <SortHeader label="Counterparty" keyName="counterparty" />
              </th>
              <th scope="col" className="px-3 py-2 text-2xs font-medium uppercase tracking-wide text-faint">
                Type
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                <SortHeader label="Amount" keyName="amount" />
              </th>
              <th scope="col" className="px-3 py-2 text-right text-2xs font-medium uppercase tracking-wide text-faint">
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((t) =>
            <tr key={t.id} className="transition-colors duration-150 ease-out hover:bg-raised">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-ink">
                  {formatDate(t.date)}
                </td>
                <td className="px-3 py-2 text-xs tabular-nums text-muted">{t.time}</td>
                <td className="px-3 py-2 font-mono text-2xs text-faint">{t.receipt}</td>
                <td className="max-w-[260px] truncate px-3 py-2 text-xs text-muted" title={t.description}>
                  {t.description}
                </td>
                <td className="px-3 py-2 text-xs text-ink">{t.counterparty}</td>
                <td className="px-3 py-2">
                  <Badge tone={TYPE_TONE[t.type]}>{t.type}</Badge>
                </td>
                <td
                className={`whitespace-nowrap px-3 py-2 text-right text-xs font-medium tabular-nums ${
                t.direction === 'in' ? 'text-income' : 'text-expense'}`
                }>
                
                  {t.direction === 'in' ? '+' : '−'}
                  {formatAmount(t.amount)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-muted">
                  {formatAmount(t.balance)}
                </td>
              </tr>
            )}
            {rows.length === 0 ?
            <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-xs text-faint">
                  No transactions match these filters.
                </td>
              </tr> :
            null}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-2xs text-faint">
          Showing {rows.length} of {filtered.length} transactions
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}>
            
            Previous
          </Button>
          <span className="text-2xs tabular-nums text-muted">
            Page {current + 1} of {pageCount}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}>
            
            Next
          </Button>
        </div>
      </div>
    </div>);

}