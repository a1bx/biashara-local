import type {
  CounterpartyStat,
  MonthlyStat,
  Totals,
  Transaction } from
'../types';
import { shortMonthLabel } from './format';

/**
 * All figures shown in the UI are computed here, deterministically.
 * The local language model only ever narrates these numbers.
 */

export function computeTotals(transactions: Transaction[]): Totals {
  let income = 0;
  let expenses = 0;
  const byDay = new Map<string, number>();

  for (const t of transactions) {
    if (t.direction === 'in') income += t.amount;else
    expenses += t.amount;
    byDay.set(t.date, (byDay.get(t.date) ?? 0) + 1);
  }

  let mostActiveDay: string | null = null;
  let mostActiveDayCount = 0;
  byDay.forEach((count, day) => {
    if (count > mostActiveDayCount) {
      mostActiveDayCount = count;
      mostActiveDay = day;
    }
  });

  const days = byDay.size || 1;

  return {
    income,
    expenses,
    net: income - expenses,
    count: transactions.length,
    avgPerDay: (income + expenses) / days,
    mostActiveDay,
    mostActiveDayCount
  };
}

export function computeCounterparties(
transactions: Transaction[])
: CounterpartyStat[] {
  const map = new Map<string, CounterpartyStat>();
  let volume = 0;

  for (const t of transactions) {
    const entry =
    map.get(t.counterparty) ??
    {
      name: t.counterparty,
      count: 0,
      moneyIn: 0,
      moneyOut: 0,
      net: 0,
      volume: 0,
      share: 0
    } as CounterpartyStat;
    entry.count += 1;
    if (t.direction === 'in') entry.moneyIn += t.amount;else
    entry.moneyOut += t.amount;
    entry.net = entry.moneyIn - entry.moneyOut;
    entry.volume += t.amount;
    volume += t.amount;
    map.set(t.counterparty, entry);
  }

  const list = Array.from(map.values()).sort((a, b) => b.volume - a.volume);
  for (const entry of list) {
    entry.share = volume === 0 ? 0 : entry.volume / volume * 100;
  }
  return list;
}

export function topCounterpartiesWithOthers(
transactions: Transaction[],
limit = 4)
: CounterpartyStat[] {
  const all = computeCounterparties(transactions);
  if (all.length <= limit + 1) return all;
  const head = all.slice(0, limit);
  const tail = all.slice(limit);
  const others: CounterpartyStat = {
    name: 'Others',
    count: tail.reduce((s, c) => s + c.count, 0),
    moneyIn: tail.reduce((s, c) => s + c.moneyIn, 0),
    moneyOut: tail.reduce((s, c) => s + c.moneyOut, 0),
    net: 0,
    volume: tail.reduce((s, c) => s + c.volume, 0),
    share: tail.reduce((s, c) => s + c.share, 0)
  };
  others.net = others.moneyIn - others.moneyOut;
  return [...head, others];
}

export function computeMonthly(transactions: Transaction[]): MonthlyStat[] {
  const map = new Map<string, MonthlyStat>();
  for (const t of transactions) {
    const key = t.date.slice(0, 7);
    const entry =
    map.get(key) ??
    {
      key,
      label: shortMonthLabel(key),
      income: 0,
      expenses: 0,
      net: 0,
      count: 0
    } as MonthlyStat;
    if (t.direction === 'in') entry.income += t.amount;else
    entry.expenses += t.amount;
    entry.net = entry.income - entry.expenses;
    entry.count += 1;
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / Math.abs(previous) * 100;
}

/** Daily running series used for the KPI sparklines. */
export function dailySeries(
transactions: Transaction[],
pick: 'in' | 'out' | 'net' | 'count')
: number[] {
  const byDay = new Map<string, number>();
  for (const t of transactions) {
    const prev = byDay.get(t.date) ?? 0;
    if (pick === 'count') byDay.set(t.date, prev + 1);else
    if (pick === 'in')
    byDay.set(t.date, prev + (t.direction === 'in' ? t.amount : 0));else
    if (pick === 'out')
    byDay.set(t.date, prev + (t.direction === 'out' ? t.amount : 0));else

    byDay.set(t.date, prev + (t.direction === 'in' ? t.amount : -t.amount));
  }
  return Array.from(byDay.entries()).
  sort((a, b) => a[0].localeCompare(b[0])).
  map(([, v]) => v);
}