import type { Statement, Transaction } from '../types';
import {
  computeCounterparties,
  computeMonthly,
  computeTotals,
  percentChange } from
'../utils/analytics';
import { formatDate, formatKES, formatPercent } from '../utils/format';

/**
 * Narrative generation. The local model only ever narrates numbers that were
 * already computed deterministically in utils/analytics.
 */

export function statementNarrative(
statement: Statement,
previous?: Statement)
: string {
  const totals = computeTotals(statement.transactions);
  const parties = computeCounterparties(statement.transactions);
  const topOut = parties.filter((p) => p.moneyOut > p.moneyIn).slice(0, 2);
  const topIn = parties.filter((p) => p.moneyIn > p.moneyOut)[0];

  const sentences: string[] = [];

  if (previous) {
    const prevTotals = computeTotals(previous.transactions);
    const change = percentChange(totals.income, prevTotals.income);
    if (change !== null) {
      sentences.push(
        `Your cash inflow ${change >= 0 ? 'increased' : 'decreased'} by ${formatPercent(
          Math.abs(change)
        )} compared with ${previous.periodLabel}, reaching ${formatKES(totals.income)}.`
      );
    }
  } else {
    sentences.push(
      `You received ${formatKES(totals.income)} and paid out ${formatKES(
        totals.expenses
      )} during ${statement.periodLabel}.`
    );
  }

  if (topOut.length > 0) {
    sentences.push(
      `Payments to ${topOut.
      map((p) => p.name).
      join(' and ')} represented two of the largest outgoing categories.`
    );
  }
  if (topIn) {
    sentences.push(
      `${topIn.name} was your largest paying customer at ${formatKES(topIn.moneyIn)}.`
    );
  }
  sentences.push(
    `Net cash flow for the period was ${formatKES(totals.net)} across ${
    totals.count} transactions.`

  );

  return sentences.join(' ');
}

export function trendsNarrative(transactions: Transaction[]): string {
  const monthly = computeMonthly(transactions);
  if (monthly.length < 2) {
    return 'Import at least two statements to see month-on-month trends.';
  }
  const last = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];
  const incomeChange = percentChange(last.income, prev.income);
  const expenseChange = percentChange(last.expenses, prev.expenses);
  const best = monthly.reduce((a, b) => b.net > a.net ? b : a);

  return [
  `Income in ${last.label} was ${formatKES(last.income)}, ${
  incomeChange !== null ?
  `${incomeChange >= 0 ? 'up' : 'down'} ${formatPercent(Math.abs(incomeChange))}` :
  'unchanged'} on ${
  prev.label}.`,
  `Expenses were ${formatKES(last.expenses)}, ${
  expenseChange !== null ?
  `${expenseChange >= 0 ? 'up' : 'down'} ${formatPercent(Math.abs(expenseChange))}` :
  'unchanged'}.`,

  `${best.label} was your strongest month for net cash flow at ${formatKES(best.net)}.`].
  join(' ');
}

export interface BusinessDataAnswer {
  summary: string;
  bullets: string[];
  basis: string;
}

/** Answers business-data questions from computed figures only. */
export function answerBusinessQuestion(
question: string,
transactions: Transaction[],
periodLabel: string)
: BusinessDataAnswer {
  const q = question.toLowerCase();
  const totals = computeTotals(transactions);
  const parties = computeCounterparties(transactions);
  const basis = `Calculated from ${totals.count} parsed transactions in ${periodLabel}.`;

  if (q.includes('expense') || q.includes('spend') || q.includes('spent') || q.includes('cost')) {
    const top = parties.filter((p) => p.moneyOut > 0).sort((a, b) => b.moneyOut - a.moneyOut).slice(0, 4);
    return {
      summary: `You spent ${formatKES(totals.expenses)} in ${periodLabel}. Your largest outgoing payments were:`,
      bullets: top.map(
        (p) => `${p.name} — ${formatKES(p.moneyOut)} across ${p.count} transactions`
      ),
      basis
    };
  }

  if (q.includes('customer') || q.includes('paid me') || q.includes('income') || q.includes('revenue') || q.includes('sales')) {
    const top = parties.filter((p) => p.moneyIn > 0).sort((a, b) => b.moneyIn - a.moneyIn).slice(0, 4);
    return {
      summary: `You received ${formatKES(totals.income)} in ${periodLabel}. Your largest paying customers were:`,
      bullets: top.map(
        (p) => `${p.name} — ${formatKES(p.moneyIn)} across ${p.count} payments`
      ),
      basis
    };
  }

  if (q.includes('cash flow') || q.includes('cashflow') || q.includes('net') || q.includes('profit')) {
    return {
      summary: `Net cash flow for ${periodLabel} was ${formatKES(totals.net)}.`,
      bullets: [
      `Money in: ${formatKES(totals.income)}`,
      `Money out: ${formatKES(totals.expenses)}`,
      `Average daily movement: ${formatKES(totals.avgPerDay)}`],

      basis
    };
  }

  if (q.includes('transaction') || q.includes('busiest') || q.includes('active')) {
    return {
      summary: `You had ${totals.count} transactions in ${periodLabel}.`,
      bullets: [
      totals.mostActiveDay ?
      `Most active day: ${formatDate(totals.mostActiveDay)} with ${totals.mostActiveDayCount} transactions` :
      'No daily activity recorded.',
      `Average value moved per active day: ${formatKES(totals.avgPerDay)}`],

      basis
    };
  }

  return {
    summary: `Here is the summary for ${periodLabel}.`,
    bullets: [
    `Money in: ${formatKES(totals.income)}`,
    `Money out: ${formatKES(totals.expenses)}`,
    `Net cash flow: ${formatKES(totals.net)}`,
    `Transactions: ${totals.count}`],

    basis
  };
}