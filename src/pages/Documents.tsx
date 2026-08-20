import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2Icon,
  DownloadIcon,
  EyeIcon,
  FilePlusIcon,
  PrinterIcon,
  RotateCcwIcon,
  SparklesIcon } from
'lucide-react';
import { BusinessDetailsForm } from '../components/documents/BusinessDetailsForm';
import { CustomerDetailsForm } from '../components/documents/CustomerDetailsForm';
import { DocumentItems } from '../components/documents/DocumentItems';
import { DocumentPreview } from '../components/documents/DocumentPreview';
import { DocumentTypeSelector } from '../components/documents/DocumentTypeSelector';
import { Badge, toneForStatus } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, CardHeader } from '../components/common/Card';
import { Field } from '../components/common/Field';
import { Modal } from '../components/common/Modal';
import { useApp } from '../contexts/AppContext';
import {
  VAT_RATE,
  computeDocumentTotals,
  isLetter,
  nextReference } from
'../services/documentGenerator';
import type {
  BusinessDocument,
  DocumentKind,
  LineItem,
  PartyDetails } from
'../types';
import { downloadDocument, printDocument } from '../utils/exportDocument';
import { relativeTime } from '../utils/format';

const EMPTY_CUSTOMER: PartyDetails = {
  name: '',
  address: '',
  phone: '',
  email: ''
};

const STARTER_ITEMS: LineItem[] = [
{ id: 'item-1', description: '', quantity: 1, unitPrice: 0 }];


export function Documents() {
  const { business, setBusiness, documents, addDocument } = useApp();
  const [params, setParams] = useSearchParams();

  const [kind, setKind] = useState<DocumentKind>('Quotation');
  const [customer, setCustomer] = useState<PartyDetails>(EMPTY_CUSTOMER);
  const [items, setItems] = useState<LineItem[]>(STARTER_ITEMS);
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<BusinessDocument | null>(null);
  const [generated, setGenerated] = useState<BusinessDocument | null>(null);
  const [generating, setGenerating] = useState(false);

  const openedId = params.get('doc');
  useEffect(() => {
    if (!openedId) return;
    const found = documents.find((d) => d.id === openedId);
    if (found) setPreview(found);
  }, [openedId, documents]);

  const totals = useMemo(() => computeDocumentTotals(items), [items]);
  const letter = isLetter(kind);

  const buildDocument = (status: 'Draft' | 'Final'): BusinessDocument => {
    const now = new Date().toISOString();
    return {
      id: `doc-${Date.now()}`,
      reference: nextReference(kind, documents.filter((d) => d.kind === kind).length),
      kind,
      business,
      customer,
      items: letter ? [] : items,
      body,
      vatRate: VAT_RATE,
      subtotal: letter ? 0 : totals.subtotal,
      vat: letter ? 0 : totals.vat,
      total: letter ? 0 : totals.total,
      createdAt: now,
      modifiedAt: now,
      status
    };
  };

  const reset = () => {
    setCustomer(EMPTY_CUSTOMER);
    setItems(STARTER_ITEMS);
    setBody('');
    setGenerated(null);
  };

  const canGenerate =
  customer.name.trim().length > 0 && (
  letter ? body.trim().length > 0 : items.some((i) => i.description.trim()));

  const generate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      const doc = buildDocument('Final');
      addDocument(doc);
      setGenerated(doc);
      setGenerating(false);
    }, 500);
  };

  return (
    <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-4 px-6 py-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="space-y-4">
        <DocumentTypeSelector value={kind} onChange={setKind} />

        <Card>
          <CardHeader title="Recent Documents" />
          {documents.length === 0 ?
          <p className="px-4 py-6 text-center text-2xs text-faint">
              Generated documents appear here.
            </p> :

          <ul className="max-h-[280px] divide-y divide-hairline overflow-y-auto">
              {documents.slice(0, 8).map((doc) =>
            <li key={doc.id}>
                  <button
                type="button"
                onClick={() => setPreview(doc)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-raised">
                
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-ink">
                        {doc.reference}
                      </span>
                      <span className="block text-2xs text-faint">
                        {relativeTime(doc.createdAt)}
                      </span>
                    </span>
                    <Badge tone={toneForStatus(doc.status)}>{doc.status}</Badge>
                  </button>
                </li>
            )}
            </ul>
          }
        </Card>
      </div>

      <Card className="min-h-[600px]">
        <CardHeader
          title="Create a business document"
          subtitle="Generate professional documents from your business information."
          action={
          <Button
            size="sm"
            variant="secondary"
            icon={<FilePlusIcon className="h-3.5 w-3.5" />}
            onClick={reset}>
            
              New Document
            </Button>
          } />
        

        {generated ?
        <div className="mx-5 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-success/25 bg-success/5 px-4 py-3">
            <CheckCircle2Icon
            className="h-4 w-4 shrink-0 text-success"
            aria-hidden="true" />
          
            <p className="flex-1 text-xs text-ink" role="status">
              Document generated successfully — {generated.reference} saved to My
              Documents on this device.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPreview(generated)}>
                Open
              </Button>
              <Button
              size="sm"
              variant="secondary"
              icon={<DownloadIcon className="h-3.5 w-3.5" />}
              onClick={() => downloadDocument(generated)}>
              
                Save
              </Button>
              <Button
              size="sm"
              variant="secondary"
              icon={<PrinterIcon className="h-3.5 w-3.5" />}
              onClick={() => printDocument(generated)}>
              
                Print
              </Button>
            </div>
          </div> :
        null}

        <div className="space-y-6 px-5 py-5">
          <BusinessDetailsForm value={business} onChange={setBusiness} />
          <CustomerDetailsForm
            value={customer}
            onChange={setCustomer}
            title={
            kind === 'Supplier Letter' ?
            '2. Supplier Details' :
            '2. Customer Details'
            } />
          

          {letter ?
          <fieldset>
              <legend className="mb-2.5 text-xs font-semibold text-ink">
                3. Message
              </legend>
              <Field
              label="Body"
              multiline
              rows={8}
              value={body}
              onChange={setBody}
              placeholder="Write the letter content here…" />
            
            </fieldset> :

          <>
              <DocumentItems items={items} onChange={setItems} />
              <fieldset>
                <legend className="mb-2.5 text-xs font-semibold text-ink">
                  4. Notes (optional)
                </legend>
                <Field
                label="Notes"
                multiline
                rows={3}
                value={body}
                onChange={setBody}
                placeholder="Payment terms, delivery notes, validity period…" />
              
              </fieldset>
            </>
          }
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-surface px-5 py-3">
          <p className="text-2xs text-faint">
            Documents are generated and stored on this device.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              icon={<RotateCcwIcon className="h-4 w-4" />}
              onClick={reset}>
              
              Clear
            </Button>
            <Button
              variant="secondary"
              icon={<EyeIcon className="h-4 w-4" />}
              onClick={() => setPreview(buildDocument('Draft'))}>
              
              Preview
            </Button>
            <Button
              icon={<SparklesIcon className="h-4 w-4" />}
              disabled={!canGenerate || generating}
              onClick={generate}>
              
              {generating ? 'Generating…' : 'Generate Document'}
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={preview !== null}
        title={preview ? `${preview.kind} preview` : 'Preview'}
        subtitle={preview?.reference}
        width="max-w-3xl"
        onClose={() => {
          setPreview(null);
          if (openedId) {
            params.delete('doc');
            setParams(params, { replace: true });
          }
        }}
        footer={
        preview ?
        <>
              <Button
            variant="secondary"
            icon={<PrinterIcon className="h-4 w-4" />}
            onClick={() => printDocument(preview)}>
            
                Print
              </Button>
              <Button
            icon={<DownloadIcon className="h-4 w-4" />}
            onClick={() => downloadDocument(preview)}>
            
                Save
              </Button>
            </> :
        null
        }>
        
        {preview ? <DocumentPreview doc={preview} /> : null}
      </Modal>
    </div>);

}