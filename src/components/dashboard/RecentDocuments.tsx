import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileIcon, FilePlusIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { relativeTime } from '../../utils/format';
import { Badge, toneForStatus } from '../common/Badge';
import { Card, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';

export function RecentDocuments() {
  const navigate = useNavigate();
  const { files } = useApp();

  const recent = [...files].
  sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)).
  slice(0, 5);

  return (
    <Card>
      <CardHeader
        title="Recent Documents"
        action={
        <button
          type="button"
          onClick={() => navigate('/files')}
          className="text-2xs font-medium text-brand-bright transition-colors duration-150 ease-out hover:text-brand">
          
            View all
          </button>
        } />
      
      {recent.length === 0 ?
      <EmptyState
        icon={<FilePlusIcon className="h-5 w-5" />}
        title="No documents yet"
        description="Your generated quotations, invoices and letters will appear here."
        actionLabel="Create Document"
        onAction={() => navigate('/documents')} /> :


      <ul className="divide-y divide-hairline">
          {recent.map((file) =>
        <li key={file.id}>
              <button
            type="button"
            onClick={() => navigate(file.linkTo ?? '/files')}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150 ease-out hover:bg-raised">
            
                <FileIcon
              className="h-4 w-4 shrink-0 text-faint"
              aria-hidden="true" />
            
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-ink">
                    {file.name}
                  </span>
                  <span className="block text-2xs text-faint">
                    {relativeTime(file.modifiedAt)}
                  </span>
                </span>
                <Badge tone={toneForStatus(file.status)}>{file.status}</Badge>
              </button>
            </li>
        )}
        </ul>
      }
    </Card>);

}