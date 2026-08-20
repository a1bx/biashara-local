import React from 'react';
import { formatKES } from '../../utils/format';

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
  currency?: boolean;
}

export function ChartTooltip({
  active,
  label,
  payload,
  currency = true
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-2 shadow-xl">
      {label !== undefined ?
      <p className="mb-1 text-2xs font-medium text-muted">{label}</p> :
      null}
      <ul className="space-y-0.5">
        {payload.map((item, index) =>
        <li
          key={`${item.name}-${index}`}
          className="flex items-center gap-2 text-xs text-ink">
          
            <span
            className="h-2 w-2 rounded-sm"
            style={{ backgroundColor: item.color }}
            aria-hidden="true" />
          
            <span className="text-muted">{item.name}</span>
            <span className="ml-auto font-medium tabular-nums">
              {currency && typeof item.value === 'number' ?
            formatKES(item.value) :
            String(item.value ?? '')}
            </span>
          </li>
        )}
      </ul>
    </div>);

}