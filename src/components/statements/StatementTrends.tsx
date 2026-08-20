import React, { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from
'recharts';
import type { Transaction } from '../../types';
import { computeMonthly } from '../../utils/analytics';
import { trendsNarrative } from '../../services/narrative';
import { formatCompact } from '../../utils/format';
import { ChartTooltip } from '../charts/ChartTooltip';

export function StatementTrends({
  transactions


}: {transactions: Transaction[];}) {
  const monthly = useMemo(() => computeMonthly(transactions), [transactions]);

  return (
    <div className="px-5 py-4">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={monthly}
            margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            
            <CartesianGrid stroke="#182122" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#5D7170', fontSize: 11 }} />
            
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fill: '#5D7170', fontSize: 11 }}
              tickFormatter={(v: number) => formatCompact(v)} />
            
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={40}
              tick={{ fill: '#5D7170', fontSize: 11 }} />
            
            <Tooltip cursor={{ fill: '#ffffff08' }} content={<ChartTooltip />} />
            <Legend
              verticalAlign="top"
              align="left"
              height={28}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) =>
              <span className="text-2xs text-muted">{value}</span>
              } />
            
            <Bar
              yAxisId="left"
              dataKey="income"
              name="Income"
              fill="#17B8A6"
              radius={[3, 3, 0, 0]}
              maxBarSize={20} />
            
            <Bar
              yAxisId="left"
              dataKey="expenses"
              name="Expenses"
              fill="#F0555C"
              radius={[3, 3, 0, 0]}
              maxBarSize={20} />
            
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="net"
              name="Net cash flow"
              stroke="#F5A524"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#F5A524' }} />
            
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="count"
              name="Transaction volume"
              stroke="#4C82F7"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false} />
            
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-4 rounded-lg border border-line bg-panel p-3.5 text-xs leading-relaxed text-muted">
        {trendsNarrative(transactions)}
      </p>
    </div>);

}