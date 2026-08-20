import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from
'recharts';
import type { MonthlyStat } from '../../types';
import { formatCompact } from '../../utils/format';
import { ChartTooltip } from '../charts/ChartTooltip';

interface IncomeExpenseChartProps {
  data: MonthlyStat[];
  height?: number;
}

export function IncomeExpenseChart({
  data,
  height = 260
}: IncomeExpenseChartProps) {
  return (
    <div style={{ height }} className="w-full px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#182122" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#5D7170', fontSize: 11 }} />
          
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: '#5D7170', fontSize: 11 }}
            tickFormatter={(v: number) => formatCompact(v)} />
          
          <Tooltip
            cursor={{ fill: '#ffffff08' }}
            content={<ChartTooltip />} />
          
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
            dataKey="income"
            name="Income"
            fill="#17B8A6"
            radius={[3, 3, 0, 0]}
            maxBarSize={22} />
          
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="#F0555C"
            radius={[3, 3, 0, 0]}
            maxBarSize={22} />
          
        </BarChart>
      </ResponsiveContainer>
    </div>);

}