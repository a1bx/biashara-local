import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from
'recharts';
import type { Transaction } from '../../types';
import { computeCounterparties } from '../../utils/analytics';
import { formatAmount, formatCompact } from '../../utils/format';
import { ChartTooltip } from '../charts/ChartTooltip';

export function CounterpartyTable({
  transactions


}: {transactions: Transaction[];}) {
  const stats = useMemo(
    () => computeCounterparties(transactions),
    [transactions]
  );
  const chartData = stats.slice(0, 6).map((s) => ({
    name: s.name.length > 16 ? `${s.name.slice(0, 15)}…` : s.name,
    volume: s.volume
  }));

  return (
    <div className="px-5 py-4">
      <section aria-label="Largest counterparties by volume">
        <h3 className="text-xs font-semibold text-ink">Largest counterparties</h3>
        <div className="mt-2 h-[190px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
              
              <CartesianGrid stroke="#182122" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#5D7170', fontSize: 11 }}
                tickFormatter={(v: number) => formatCompact(v)} />
              
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#8DA1A0', fontSize: 11 }} />
              
              <Tooltip cursor={{ fill: '#ffffff08' }} content={<ChartTooltip />} />
              <Bar
                dataKey="volume"
                name="Volume"
                fill="#17B8A6"
                radius={[0, 3, 3, 0]}
                maxBarSize={16} />
              
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-5 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <caption className="sr-only">Counterparties ranked by total volume</caption>
          <thead className="bg-panel">
            <tr className="text-2xs uppercase tracking-wide text-faint">
              <th scope="col" className="px-3 py-2 font-medium">Rank</th>
              <th scope="col" className="px-3 py-2 font-medium">Counterparty</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Transactions</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Money In</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Money Out</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {stats.map((stat, index) =>
            <tr key={stat.name} className="transition-colors duration-150 ease-out hover:bg-raised">
                <td className="px-3 py-2 text-xs tabular-nums text-faint">{index + 1}</td>
                <td className="px-3 py-2 text-xs text-ink">{stat.name}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-muted">
                  {stat.count}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-income">
                  {stat.moneyIn ? formatAmount(stat.moneyIn) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-expense">
                  {stat.moneyOut ? formatAmount(stat.moneyOut) : '—'}
                </td>
                <td
                className={`px-3 py-2 text-right text-xs font-medium tabular-nums ${
                stat.net >= 0 ? 'text-income' : 'text-expense'}`
                }>
                
                  {stat.net >= 0 ? '' : '−'}
                  {formatAmount(Math.abs(stat.net))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>);

}