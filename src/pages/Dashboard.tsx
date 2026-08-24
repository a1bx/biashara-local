import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadIcon } from 'lucide-react';
import { AskQuestion } from '../components/dashboard/AskQuestion';
import { CounterpartyChart } from '../components/dashboard/CounterpartyChart';
import { IncomeExpenseChart } from '../components/dashboard/IncomeExpenseChart';
import { RecentDocuments } from '../components/dashboard/RecentDocuments';
import { StatCard } from '../components/dashboard/StatCard';
import { Card, CardHeader } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../contexts/AppContext';
import {
  computeMonthly,
  computeTotals,
  dailySeries,
  percentChange,
  topCounterpartiesWithOthers } from
'../utils/analytics';
import { formatAmount, formatKES, formatPercent } from '../utils/format';

export function Dashboard() {
  const navigate = useNavigate();
  const { statements, latestStatement, allTransactions } = useApp();

  const previous = useMemo(() => {
    if (!latestStatement) return null;
    const startOf = (s: (typeof statements)[number]) =>
    s.transactions[0]?.date ?? '';
    const ordered = [...statements].sort((a, b) =>
    startOf(a).localeCompare(startOf(b))
    );
    const index = ordered.findIndex((s) => s.id === latestStatement.id);
    return index > 0 ? ordered[index - 1] : null;
  }, [statements, latestStatement]);

  const totals = useMemo(
    () => computeTotals(latestStatement?.transactions ?? []),
    [latestStatement]
  );
  const prevTotals = useMemo(
    () => computeTotals(previous?.transactions ?? []),
    [previous]
  );
  const monthly = useMemo(
    () => computeMonthly(allTransactions).slice(-6),
    [allTransactions]
  );
  const counterparties = useMemo(
    () => topCounterpartiesWithOthers(latestStatement?.transactions ?? []),
    [latestStatement]
  );

  const txns = latestStatement?.transactions ?? [];
  const incomeChange = percentChange(totals.income, prevTotals.income);
  const expenseChange = percentChange(totals.expenses, prevTotals.expenses);
  const netChange = percentChange(totals.net, prevTotals.net);
  const countChange = totals.count - prevTotals.count;

  return (
    <div className="mx-auto w-full max-w-[1560px] px-6 py-5">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-ink">Karibu!</h2>
        <p className="mt-1 text-sm text-muted">
          Your offline assistant for running and growing your business.
        </p>
      </div>

      {statements.length === 0 ?
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader
            title="No statements yet"
            subtitle="Your dashboard fills in once a statement is parsed on this device." />
          
            <EmptyState
            icon={<UploadIcon className="h-5 w-5" />}
            title="No statements yet"
            description="Import your first M-Pesa statement to start understanding your business finances."
            actionLabel="Import Statement"
            onAction={() => navigate('/statements')} />
          
          </Card>
          <div className="space-y-4">
            <RecentDocuments />
            <AskQuestion />
          </div>
        </div> :

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
              label="Total Income"
              value={formatKES(totals.income)}
              delta={incomeChange !== null ? formatPercent(incomeChange) : null}
              deltaPositive={(incomeChange ?? 0) >= 0}
              series={dailySeries(txns, 'in')}
              color="#2DD4BF"
              accent
              onClick={() =>
              navigate(`/statements/${latestStatement?.id}`, {
                state: { tab: 'Summary' }
              })
              } />
            
              <StatCard
              label="Total Expenses"
              value={formatKES(totals.expenses)}
              delta={
              expenseChange !== null ? formatPercent(expenseChange) : null
              }
              deltaPositive={(expenseChange ?? 0) <= 0}
              series={dailySeries(txns, 'out')}
              color="#F0555C"
              onClick={() =>
              navigate(`/statements/${latestStatement?.id}`, {
                state: { tab: 'Counterparties' }
              })
              } />
            
              <StatCard
              label="Net Cash Flow"
              value={formatKES(totals.net)}
              delta={netChange !== null ? formatPercent(netChange) : null}
              deltaPositive={(netChange ?? 0) >= 0}
              series={dailySeries(txns, 'net')}
              color="#F5A524"
              onClick={() =>
              navigate(`/statements/${latestStatement?.id}`, {
                state: { tab: 'Trends' }
              })
              } />
            
              <StatCard
              label="Transactions"
              value={formatAmount(totals.count)}
              delta={
              prevTotals.count ?
              `${countChange >= 0 ? '+' : ''}${countChange}` :
              null
              }
              deltaPositive={countChange >= 0}
              series={dailySeries(txns, 'count')}
              color="#4C82F7"
              onClick={() =>
              navigate(`/statements/${latestStatement?.id}`, {
                state: { tab: 'Transactions' }
              })
              } />
            
            </div>

            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
              <Card>
                <CardHeader title="Income vs Expenses" subtitle="Last 6 months" />
                <IncomeExpenseChart data={monthly} />
              </Card>
              <Card>
                <CardHeader
                title="Top Counterparties by Amount"
                subtitle={latestStatement?.periodLabel} />
              
                <CounterpartyChart data={counterparties} />
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <RecentDocuments />
            <AskQuestion />
          </div>
        </div>
      }
    </div>);

}