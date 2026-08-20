import React from 'react';
import { ArrowDownRightIcon, ArrowUpRightIcon } from 'lucide-react';
import { Sparkline } from '../common/Sparkline';

interface StatCardProps {
  label: string;
  value: string;
  delta: string | null;
  deltaPositive: boolean;
  series: number[];
  color: string;
  onClick: () => void;
  accent?: boolean;
}

export function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  series,
  color,
  onClick,
  accent = false
}: StatCardProps) {
  const DeltaIcon = deltaPositive ? ArrowUpRightIcon : ArrowDownRightIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full flex-col rounded-xl border bg-surface px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:border-brand/40 ${
      accent ? 'border-brand/30' : 'border-line'}`
      }>
      
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="min-w-0 truncate text-xl font-semibold tabular-nums text-ink">
          {value}
        </span>
        <span className="h-8 w-[72px] shrink-0 overflow-hidden">
          <Sparkline values={series} color={color} width={72} height={32} />
        </span>
      </div>
      {delta ?
      <span className="mt-2 flex items-center gap-1 text-2xs">
          <DeltaIcon
          className={`h-3 w-3 ${deltaPositive ? 'text-success' : 'text-expense'}`}
          aria-hidden="true" />
        
          <span
          className={`font-medium ${deltaPositive ? 'text-success' : 'text-expense'}`}>
          
            {delta}
          </span>
          <span className="text-faint">vs last month</span>
        </span> :

      <span className="mt-2 text-2xs text-faint">No prior month to compare</span>
      }
    </button>);

}