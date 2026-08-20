import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DownloadIcon, FileIcon, FilePlusIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { Badge, toneForStatus } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, CardHeader } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Field } from '../components/common/Field';
import { Modal } from '../components/common/Modal';
import { SearchInput } from '../components/common/SearchInput';
import { useApp } from '../contexts/AppContext';
import { downloadDocument } from '../utils/exportDocument';
import { formatDate, relativeTime } from '../utils/format';
import type { StoredFileCategory } from '../types';

const CATEGORIES: Array<StoredFileCategory | 'All'> = [
'All',
'Statements',
'Invoices',
'Quotations',
'Receipts',
'Letters',
'Compliance Sources'];


export function MyDocuments() {
  const navigate = useNavigate();
  const {
    files,
    documents,
    renameDocument,
    deleteDocument,
    renameFile,
    deleteFile,
    removeStatement,
    statements
  } = useApp();

  const [category, setCategory] = useState<StoredFileCategory | 'All'>('All');
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState<{id: string;name: string;} | null>(
    null
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.
    filter((file) => category === 'All' || file.category === category).
    filter((file) => !q || file.name.toLowerCase().includes(q)).
    sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  }, [files, category, query]);

  const handleOpen = (linkTo?: string) => {
    if (linkTo) navigate(linkTo);
  };

  const handleDelete = (id: string) => {
    const docId = id.replace(/^file-/, '');
    if (documents.some((d) => d.id === docId)) deleteDocument(docId);else
    if (statements.some((s) => s.id === docId)) removeStatement(docId);else
    deleteFile(id);
  };

  const commitRename = () => {
    if (!renaming) return;
    const docId = renaming.id.replace(/^file-/, '');
    if (documents.some((d) => d.id === docId)) renameDocument(docId, renaming.name);else
    renameFile(renaming.id, renaming.name);
    setRenaming(null);
  };

  const handleExport = (id: string) => {
    const docId = id.replace(/^file-/, '');
    const doc = documents.find((d) => d.id === docId);
    if (doc) downloadDocument(doc);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">My Documents</h2>
          <p className="mt-1 text-sm text-muted">
            Everything Biashara Local has parsed or generated, stored on this
            device.
          </p>
        </div>
        <Button
          icon={<FilePlusIcon className="h-4 w-4" />}
          onClick={() => navigate('/documents')}>
          
          Create Document
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          label="Search documents"
          value={query}
          onChange={setQuery}
          placeholder="Search by file name…"
          className="min-w-[240px] max-w-sm flex-1" />
        
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {CATEGORIES.map((item) =>
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            className={`rounded-lg border px-2.5 py-1.5 text-2xs transition-colors duration-150 ease-out ${
            category === item ?
            'border-brand/40 bg-brand/10 text-brand-bright' :
            'border-line bg-panel text-muted hover:text-ink'}`
            }>
            
              {item}
            </button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader
          title="Local files"
          subtitle={`${filtered.length} item${filtered.length === 1 ? '' : 's'}`} />
        
        {filtered.length === 0 ?
        <EmptyState
          icon={<FileIcon className="h-5 w-5" />}
          title="No documents"
          description="Your generated quotations, invoices and letters will appear here."
          actionLabel="Create Document"
          onAction={() => navigate('/documents')} /> :


        <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <caption className="sr-only">Locally stored documents</caption>
              <thead className="bg-panel">
                <tr className="text-2xs uppercase tracking-wide text-faint">
                  <th scope="col" className="px-5 py-2 font-medium">Name</th>
                  <th scope="col" className="px-3 py-2 font-medium">Type</th>
                  <th scope="col" className="px-3 py-2 font-medium">Created</th>
                  <th scope="col" className="px-3 py-2 font-medium">Modified</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-5 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filtered.map((file) =>
              <tr key={file.id} className="transition-colors duration-150 ease-out hover:bg-raised">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <FileIcon className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="truncate text-xs text-ink">{file.name}</p>
                          <p className="text-2xs text-faint">{file.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted">{file.type}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted">
                      {relativeTime(file.modifiedAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={toneForStatus(file.status)}>{file.status}</Badge>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpen(file.linkTo)}
                      disabled={!file.linkTo}>
                      
                          Open
                        </Button>
                        <button
                      type="button"
                      aria-label={`Rename ${file.name}`}
                      onClick={() => setRenaming({ id: file.id, name: file.name })}
                      className="rounded-md p-1.5 text-faint transition-colors duration-150 ease-out hover:bg-panel hover:text-ink">
                      
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                      type="button"
                      aria-label={`Export ${file.name}`}
                      onClick={() => handleExport(file.id)}
                      className="rounded-md p-1.5 text-faint transition-colors duration-150 ease-out hover:bg-panel hover:text-ink">
                      
                          <DownloadIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                      type="button"
                      aria-label={`Delete ${file.name}`}
                      onClick={() => handleDelete(file.id)}
                      className="rounded-md p-1.5 text-faint transition-colors duration-150 ease-out hover:bg-expense/10 hover:text-expense">
                      
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }
      </Card>

      <Modal
        open={renaming !== null}
        title="Rename document"
        onClose={() => setRenaming(null)}
        width="max-w-md"
        footer={
        <>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button onClick={commitRename}>Save</Button>
          </>
        }>
        
        <Field
          label="Name"
          value={renaming?.name ?? ''}
          onChange={(value) =>
          setRenaming((prev) => prev ? { ...prev, name: value } : prev)
          } />
        
      </Modal>
    </div>);

}