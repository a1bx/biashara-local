import React from 'react';
import { CpuIcon } from 'lucide-react';
import type { Statement } from '../../types';
import { computeTotals } from '../../utils/analytics';
import { formatAmount, formatDate, formatKES } from '../../utils/format';
import { statementNarrative } from '../../services/narrative';
import { Button } from '../common/Button';
interface StatementSummaryProps {
  statement: Statement;
  previous?: Statement;
  onAskFollowUp: () => void;
}
export function StatementSummary({
  statement,
  previous,
  onAskFollowUp
}: StatementSummaryProps) {
  const totals = computeTotals(statement.transactions);
  const metrics: Array<{
    label: string;
    value: string;
    tone?: string;
  }> = [{
    label: 'Total Received',
    value: formatKES(totals.income),
    tone: 'text-income'
  }, {
    label: 'Total Sent',
    value: formatKES(totals.expenses),
    tone: 'text-expense'
  }, {
    label: 'Net Flow',
    value: formatKES(totals.net),
    tone: 'text-brand-bright'
  }, {
    label: 'Transactions',
    value: formatAmount(totals.count)
  }, {
    label: 'Average per Day',
    value: formatKES(totals.avgPerDay)
  }, {
    label: 'Most Active Day',
    value: totals.mostActiveDay ? formatDate(totals.mostActiveDay) : '—'
  }];
  return <div className="px-5 py-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {metrics.map((metric) => <div key={metric.label} className="rounded-lg border border-line bg-panel px-3.5 py-3">
            <p className="text-2xs text-muted">{metric.label}</p>
            <p className={`mt-1 text-base font-semibold tabular-nums ${metric.tone ?? 'text-ink'}`}>
              {metric.value}
            </p>
          </div>)}
      </div>

      <section className="mt-5 rounded-lg border border-line bg-panel p-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-ink">
          <CpuIcon className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          Summary
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {statementNarrative(statement, previous)}
        </p>
        <p className="mt-2.5 border-t border-hairline pt-2 text-2xs text-faint">
          Written by the on-device model from figures calculated by the parser.
        </p>
      </section>

      <div className="mt-4">
        <Button variant="secondary" icon={<div className="h-4 w-4" />} onClick={onAskFollowUp}>
          Ask follow-up question
        </Button>
      </div>
    </div>;
}