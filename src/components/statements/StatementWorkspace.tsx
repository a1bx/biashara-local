import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon } from
'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { relativeTime } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { CounterpartyTable } from './CounterpartyTable';
import { StatementSummary } from './StatementSummary';
import { StatementTrends } from './StatementTrends';
import { StatementUploader } from './StatementUploader';
import { TransactionTable } from './TransactionTable';

const TABS = ['Summary', 'Transactions', 'Counterparties', 'Trends'] as const;
export type StatementTab = (typeof TABS)[number];

interface StatementWorkspaceProps {
  statementId?: string;
  initialTab?: StatementTab;
}

export function StatementWorkspace({
  statementId,
  initialTab = 'Summary'
}: StatementWorkspaceProps) {
  const navigate = useNavigate();
  const { statements, allTransactions } = useApp();
  const [tab, setTab] = useState<StatementTab>(initialTab);

  useEffect(() => setTab(initialTab), [initialTab, statementId]);

  const selected = useMemo(() => {
    if (statementId) return statements.find((s) => s.id === statementId) ?? null;
    return statements[0] ?? null;
  }, [statements, statementId]);

  const previous = useMemo(() => {
    if (!selected) return undefined;
    const startOf = (s: (typeof statements)[number]) =>
    s.transactions[0]?.date ?? '';
    const ordered = [...statements].sort((a, b) =>
    startOf(a).localeCompare(startOf(b))
    );
    const index = ordered.findIndex((s) => s.id === selected.id);
    return index > 0 ? ordered[index - 1] : undefined;
  }, [statements, selected]);

  return (
    <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-4 px-6 py-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-4">
        <StatementUploader onParsed={(id) => navigate(`/statements/${id}`)} />

        <Card>
          <div className="border-b border-hairline px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
              Recent Statements
            </h2>
          </div>
          {statements.length === 0 ?
          <p className="px-4 py-6 text-center text-2xs text-faint">
              Imported statements will be listed here.
            </p> :

          <ul className="max-h-[420px] overflow-y-auto">
              {statements.map((statement) => {
              const active = selected?.id === statement.id;
              return (
                <li key={statement.id}>
                    <button
                    type="button"
                    onClick={() => navigate(`/statements/${statement.id}`)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left transition-colors duration-150 ease-out ${
                    active ?
                    'border-brand bg-brand/10' :
                    'border-transparent hover:bg-raised'}`
                    }>
                    
                      <FileSpreadsheetIcon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-brand-bright' : 'text-faint'}`}
                      aria-hidden="true" />
                    
                      <span className="min-w-0 flex-1">
                        <span
                        className={`block truncate text-xs ${active ? 'text-brand-bright' : 'text-ink'}`}>
                        
                          {statement.periodLabel}
                        </span>
                        <span className="block text-2xs text-faint">
                          {relativeTime(statement.importedAt)} ·{' '}
                          {statement.transactions.length} txns
                        </span>
                      </span>
                    </button>
                  </li>);

            })}
            </ul>
          }
        </Card>
      </div>

      <Card className="min-h-[560px]">
        {!selected ?
        <EmptyState
          icon={<FileSpreadsheetIcon className="h-5 w-5" />}
          title="No statements yet"
          description="Import your first M-Pesa statement to start understanding your business finances. Parsing happens entirely on this device." /> :


        <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
              <div className="flex items-center gap-3">
                {statementId ?
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-2.5 py-1.5 text-2xs font-medium text-muted transition-colors duration-150 ease-out hover:border-brand/40 hover:text-brand-bright">
                
                    <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Back
                  </button> :
              null}
                <h2 className="text-sm font-semibold text-ink">
                  {selected.name}
                </h2>
                <Badge
                tone="success"
                icon={<CheckCircle2Icon className="h-3 w-3" />}>
                
                  {selected.status}
                </Badge>
              </div>
              <p className="text-2xs text-faint">
                Imported {relativeTime(selected.importedAt)} · {selected.fileName}
              </p>
            </div>

            <div
            role="tablist"
            aria-label="Statement views"
            className="flex gap-1 border-b border-hairline px-4">
            
              {TABS.map((item) =>
            <button
              key={item}
              role="tab"
              type="button"
              aria-selected={tab === item}
              onClick={() => setTab(item)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-xs font-medium transition-colors duration-150 ease-out ${
              tab === item ?
              'border-brand text-brand-bright' :
              'border-transparent text-muted hover:text-ink'}`
              }>
              
                  {item}
                </button>
            )}
            </div>

            {tab === 'Summary' ?
          <StatementSummary
            statement={selected}
            previous={previous}
            onAskFollowUp={() =>
            navigate('/compliance', {
              state: { question: 'What were my top expenses last month?' }
            })
            } /> :

          null}
            {tab === 'Transactions' ?
          <TransactionTable transactions={selected.transactions} /> :
          null}
            {tab === 'Counterparties' ?
          <CounterpartyTable transactions={selected.transactions} /> :
          null}
            {tab === 'Trends' ?
          <StatementTrends
            transactions={
            statements.length > 1 ? allTransactions : selected.transactions
            } /> :

          null}
          </>
        }
      </Card>
    </div>);

}