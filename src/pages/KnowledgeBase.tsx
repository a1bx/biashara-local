import { useMemo, useState } from 'react';
import { BookOpenIcon, DatabaseIcon } from 'lucide-react';
import { Badge, toneForStatus } from '../components/common/Badge';
import { Card, CardHeader } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { SearchInput } from '../components/common/SearchInput';
import { corpus, corpusCategories, corpusMeta } from '../data/corpus';

export function KnowledgeBase() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return corpus.filter((doc) => {
      if (category !== 'All' && doc.category !== category) return false;
      if (!q) return true;
      return `${doc.title} ${doc.category} ${doc.chunks.
      map((c) => `${c.heading} ${c.text}`).
      join(' ')}`.
      toLowerCase().
      includes(q);
    });
  }, [query, category]);

  const open = corpus.find((doc) => doc.id === openId) ?? null;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Knowledge Base</h2>
          <p className="mt-1 text-sm text-muted">
            The curated compliance corpus stored and indexed on this device.
          </p>
        </div>
        <p className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-2xs text-muted">
          <DatabaseIcon className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          {corpusMeta.docCount} documents ·{' '}
          {corpusMeta.chunkCount} indexed
          sections · no internet lookups
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          label="Search knowledge base"
          value={query}
          onChange={setQuery}
          placeholder="Search titles and content…"
          className="min-w-[240px] max-w-sm flex-1" />
        
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {corpusCategories.map((item) =>
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
        <CardHeader title="Local sources" subtitle="Used to ground every compliance answer." />
        {filtered.length === 0 ?
        <p className="px-5 py-10 text-center text-xs text-faint">
            No sources match this search.
          </p> :

        <ul className="divide-y divide-hairline">
            {filtered.map((doc) =>
          <li key={doc.id}>
                <button
              type="button"
              onClick={() => setOpenId(doc.id)}
              className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-raised">
              
                  <BookOpenIcon
                className="h-4 w-4 shrink-0 text-faint"
                aria-hidden="true" />
              
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-ink">
                      {doc.title}
                    </span>
                    <span className="block text-2xs text-faint">
                      {doc.docType} · {doc.chunks.length} sections
                    </span>
                  </span>
                  <span className="hidden w-32 text-2xs text-muted sm:block">
                    {doc.category}
                  </span>
                  <span className="hidden w-28 text-2xs text-faint md:block">
                    Snapshot {doc.snapshot}
                  </span>
                  <Badge tone={toneForStatus(doc.status)}>{doc.status}</Badge>
                </button>
              </li>
          )}
          </ul>
        }
      </Card>

      <Modal
        open={open !== null}
        title={open?.title ?? ''}
        subtitle={open ? `${open.docType} · snapshot ${open.snapshot}` : undefined}
        onClose={() => setOpenId(null)}>
        
        <div className="space-y-4">
          {open?.chunks.map((chunk) =>
          <section key={chunk.id}>
              <h3 className="text-xs font-semibold text-ink">{chunk.heading}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                {chunk.text}
              </p>
              <ul className="mt-2 space-y-1">
                {chunk.bullets.map((bullet) =>
              <li
                key={bullet}
                className="flex gap-2 text-2xs leading-relaxed text-faint">
                
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                    {bullet}
                  </li>
              )}
              </ul>
            </section>
          )}
          <p className="border-t border-hairline pt-3 text-2xs text-faint">
            This snapshot is stored locally. Verify time-sensitive requirements
            with KRA before acting on them.
          </p>
        </div>
      </Modal>
    </div>);

}