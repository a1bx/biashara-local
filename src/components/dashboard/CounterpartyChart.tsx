import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CounterpartyStat } from '../../types';
import { formatKES } from '../../utils/format';
import { ChartTooltip } from '../charts/ChartTooltip';

export const COUNTERPARTY_COLORS = [
'#4C82F7',
'#2DD4BF',
'#F5A524',
'#8B7CF6',
'#5D7170'];


interface CounterpartyChartProps {
  data: CounterpartyStat[];
  height?: number;
}

export function CounterpartyChart({
  data,
  height = 260
}: CounterpartyChartProps) {
  return (
    <div
      style={{ height }}
      className="flex w-full items-center gap-4 px-5 py-4">
      
      <div className="h-full w-[46%] min-w-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie
              data={data}
              dataKey="volume"
              nameKey="name"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={1.5}
              stroke="#0E1415"
              strokeWidth={2}>
              
              {data.map((entry, index) =>
              <Cell
                key={entry.name}
                fill={COUNTERPARTY_COLORS[index % COUNTERPARTY_COLORS.length]} />

              )}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex-1 space-y-2.5">
        {data.map((entry, index) =>
        <li key={entry.name} className="flex items-start gap-2.5">
            <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{
              backgroundColor:
              COUNTERPARTY_COLORS[index % COUNTERPARTY_COLORS.length]
            }}
            aria-hidden="true" />
          
            <div className="min-w-0">
              <p className="truncate text-xs text-ink">{entry.name}</p>
              <p className="text-2xs tabular-nums text-faint">
                {formatKES(entry.volume)} ({entry.share.toFixed(0)}%)
              </p>
            </div>
          </li>
        )}
      </ul>
    </div>);

}