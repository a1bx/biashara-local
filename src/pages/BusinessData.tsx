import { HardDriveIcon, ShieldCheckIcon } from 'lucide-react';
import { BusinessDetailsForm } from '../components/documents/BusinessDetailsForm';
import { Card, CardHeader } from '../components/common/Card';
import { useApp } from '../contexts/AppContext';
import { formatAmount, relativeTime } from '../utils/format';

export function BusinessData() {
  const { business, setBusiness, statements, allTransactions, documents } =
  useApp();

  const stats = [
  { label: 'Statements imported', value: formatAmount(statements.length) },
  { label: 'Transactions processed', value: formatAmount(allTransactions.length) },
  { label: 'Documents generated', value: formatAmount(documents.length) },
  {
    label: 'Last import',
    value: statements[0] ? relativeTime(statements[0].importedAt) : '—'
  }];


  return (
    <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Business Profile"
            subtitle="Reused whenever you draft a document. Stored locally." />
          
          <div className="px-5 py-4">
            <BusinessDetailsForm value={business} onChange={setBusiness} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Imported Data" subtitle="Everything parsed on this device." />
          <dl className="grid grid-cols-2 gap-px bg-hairline p-px lg:grid-cols-4">
            {stats.map((stat) =>
            <div key={stat.label} className="bg-surface px-4 py-4">
                <dt className="text-2xs text-muted">{stat.label}</dt>
                <dd className="mt-1 text-base font-semibold tabular-nums text-ink">
                  {stat.value}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Storage" icon={<HardDriveIcon className="h-4 w-4" />} />
          <div className="space-y-3 px-5 py-4">
            <div>
              <p className="text-2xs text-muted">Location</p>
              <p className="mt-0.5 break-all font-mono text-2xs text-ink">
                ~/.local/share/biashara-local/data.sqlite
              </p>
            </div>
            <div className="rounded-lg border border-brand/20 bg-brand-soft/40 p-3">
              <p className="flex items-center gap-2 text-xs font-medium text-brand-bright">
                <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
                No cloud synchronization
              </p>
              <p className="mt-1 text-2xs leading-relaxed text-muted">
                Statements, documents and answers never leave this computer.
                There are no accounts and no background uploads.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>);

}