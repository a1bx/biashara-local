import { useState } from 'react';
import {
  CpuIcon,
  DatabaseIcon,
  DownloadIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  Trash2Icon } from
'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, CardHeader } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { useApp } from '../contexts/AppContext';
import { ThemePreference, useTheme } from '../contexts/ThemeContext';
import { corpusMeta } from '../data/corpus';

function Row({
  label,
  hint,
  children




}: {label: string;hint?: string;children: React.ReactNode;}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5 last:border-b-0">
      <div>
        <p className="text-xs text-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-2xs text-faint">{hint}</p> : null}
      </div>
      {children}
    </div>);

}

const selectClass =
'h-8 rounded-lg border border-line bg-panel px-2.5 text-xs text-ink focus:border-brand/50 focus:outline-none';

export function Settings() {
  const { clearAllData, loadDemoData, statements, documents, history, business } =
  useApp();
  const { theme, setTheme } = useTheme();
  const [startup, setStartup] = useState('Open Dashboard');
  const [format, setFormat] = useState('PDF');
  const [confirmClear, setConfirmClear] = useState(false);

  const exportAll = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      business,
      statements: statements.map((s) => ({
        id: s.id,
        periodLabel: s.periodLabel,
        transactions: s.transactions
      })),
      documents,
      complianceHistory: history
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'biashara-local-export.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-4 px-6 py-5">
      <Card>
        <CardHeader
          title="General"
          icon={<SlidersHorizontalIcon className="h-4 w-4" />} />
        
        <Row label="Theme" hint="Switch between low-glare dark and light screens, or follow your system setting.">
          <select
            aria-label="Theme"
            className={selectClass}
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemePreference)}>

            <option value="dark">Dark (default)</option>
            <option value="light">Light</option>
            <option value="system">Follow system</option>
          </select>
        </Row>
        <Row label="Startup behaviour">
          <select
            aria-label="Startup behaviour"
            className={selectClass}
            value={startup}
            onChange={(e) => setStartup(e.target.value)}>
            
            <option>Open Dashboard</option>
            <option>Open last screen</option>
            <option>Open Statement Understanding</option>
          </select>
        </Row>
        <Row label="Default document format">
          <select
            aria-label="Default document format"
            className={selectClass}
            value={format}
            onChange={(e) => setFormat(e.target.value)}>
            
            <option>PDF</option>
            <option>HTML</option>
            <option>DOCX</option>
          </select>
        </Row>
      </Card>

      <Card>
        <CardHeader title="Local AI" icon={<CpuIcon className="h-4 w-4" />} />
        <Row label="Model status" hint="Loaded from disk at launch.">
          <Badge tone="success">Ready</Badge>
        </Row>
        <Row label="Model version">
          <span className="font-mono text-2xs text-muted">
            qwen2.5-3b-instruct-q4_k_m
          </span>
        </Row>
        <Row label="Context size" hint="Prompt budget managed by the orchestrator.">
          <span className="text-xs tabular-nums text-muted">4096 tokens</span>
        </Row>
        <Row
          label="Retrieval index"
          hint={`${corpusMeta.docCount} documents · ${corpusMeta.chunkCount} embedded sections · ${corpusMeta.embedModel}`}>
          
          <Badge tone="brand">Indexed locally</Badge>
        </Row>
      </Card>

      <Card>
        <CardHeader title="Data" icon={<DatabaseIcon className="h-4 w-4" />} />
        <Row label="Storage location">
          <span className="break-all font-mono text-2xs text-muted">
            ~/.local/share/biashara-local/
          </span>
        </Row>
        <Row label="Export local data" hint="Writes a JSON copy to a folder you choose.">
          <Button
            size="sm"
            variant="secondary"
            icon={<DownloadIcon className="h-3.5 w-3.5" />}
            onClick={exportAll}>
            
            Export
          </Button>
        </Row>
        <Row label="Load sample data" hint="Synthetic Kenyan SME data for exploring the app.">
          <Button size="sm" variant="secondary" onClick={loadDemoData}>
            Load sample
          </Button>
        </Row>
        <Row label="Clear local data" hint="Removes statements, documents and answers from this device.">
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2Icon className="h-3.5 w-3.5" />}
            onClick={() => setConfirmClear(true)}>
            
            Clear
          </Button>
        </Row>
      </Card>

      <Card>
        <CardHeader title="Privacy" icon={<ShieldCheckIcon className="h-4 w-4" />} />
        <div className="px-5 py-4">
          <p className="text-xs leading-relaxed text-ink">
            Your data stays on this device.
          </p>
          <p className="mt-1.5 text-2xs leading-relaxed text-muted">
            Biashara Local does not require an internet connection after
            installation. Statement parsing, document generation, retrieval and
            the language model all run locally.
          </p>
        </div>
      </Card>

      <Modal
        open={confirmClear}
        title="Clear all local data?"
        subtitle="This cannot be undone."
        width="max-w-md"
        onClose={() => setConfirmClear(false)}
        footer={
        <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
            variant="danger"
            onClick={() => {
              clearAllData();
              setConfirmClear(false);
            }}>
            
              Clear data
            </Button>
          </>
        }>
        
        <p className="text-xs leading-relaxed text-muted">
          Statements, parsed transactions, generated documents and saved
          compliance answers will be deleted from this computer. The compliance
          knowledge base stays installed.
        </p>
      </Modal>
    </div>);

}