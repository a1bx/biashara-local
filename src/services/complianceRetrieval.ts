import { corpus } from '../data/corpus';
import type { ComplianceAnswer, CorpusChunk, CorpusDocument } from '../types';
import { retrieveRemote, type RetrievedChunk } from './retrieval';

export type Intent = 'business-data' | 'compliance' | 'document' | 'unsupported';

export { SAMPLE_QUESTIONS } from '../data/corpus';

const BUSINESS_TERMS = [
  'expense', 'expenses', 'income', 'revenue', 'sales', 'paid', 'spend',
  'spent', 'cash flow', 'cashflow', 'transaction', 'transactions',
  'customer', 'customers', 'counterparty', 'statement', 'balance',
  'last month', 'top', 'earn', 'received',
];

const DOCUMENT_TERMS = [
  'quotation', 'quote', 'draft', 'write a letter', 'create an invoice',
  'generate an invoice', 'receipt for', 'supplier letter', 'customer letter',
];

const COMPLIANCE_TERMS = [
  'vat', 'tax', 'kra', 'etims', 'turnover', 'register', 'registration',
  'file', 'filing', 'return', 'compliance', 'penalty', 'pin', 'permit',
  'licence', 'license', 'paye', 'threshold', 'invoice requirement',
];

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'a', 'an', 'for', 'of', 'in', 'to', 'do', 'i',
  'my', 'how', 'are', 'and', 'on', 'with', 'me', 'can', 'should', 'does',
  'business', 'businesses', 'kenya', 'kenyan',
]);

export function detectIntent(question: string): Intent {
  const q = question.toLowerCase();
  if (DOCUMENT_TERMS.some((t) => q.includes(t))) return 'document';
  const complianceHits = COMPLIANCE_TERMS.filter((t) => q.includes(t)).length;
  const businessHits = BUSINESS_TERMS.filter((t) => q.includes(t)).length;
  if (complianceHits > businessHits && complianceHits > 0) return 'compliance';
  if (businessHits > 0) return 'business-data';
  if (complianceHits > 0) return 'compliance';
  return 'unsupported';
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

export interface Match {
  doc: CorpusDocument;
  chunk: CorpusChunk;
  score: number;
}

function remoteToMatch(m: RetrievedChunk): Match {
  const doc =
    corpus.find((d) => d.id === m.docId) ?? {
      id: m.docId,
      title: m.docTitle,
      category: m.category,
      docType: m.docType,
      snapshot: m.snapshot,
      status: 'Indexed' as const,
      chunks: [],
    };
  const chunk: CorpusChunk = {
    id: m.chunkId,
    heading: m.heading,
    text: m.text,
    keywords: m.keywords,
    bullets: m.bullets,
    followUps: m.followUps,
  };
  return { doc, chunk, score: m.score };
}

/** Local keyword fallback when the retrieval service is offline. */
export function retrieveLocal(question: string, limit = 3): Match[] {
  const tokens = tokenize(question);
  const matches: Match[] = [];

  for (const doc of corpus) {
    for (const chunk of doc.chunks) {
      const haystack = `${doc.title} ${doc.category} ${chunk.heading} ${chunk.text} ${chunk.keywords.join(' ')} ${chunk.bullets.join(' ')}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (chunk.keywords.some((k) => k.includes(token))) score += 3;
        else if (haystack.includes(token)) score += 1;
      }
      for (const keyword of chunk.keywords) {
        if (keyword.includes(' ') && question.toLowerCase().includes(keyword)) {
          score += 4;
        }
      }
      if (score > 0) matches.push({ doc, chunk, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Retrieve top-k compliance chunks. Uses the SQLite index service when
 * available, otherwise falls back to in-memory keyword search.
 */
export async function retrieve(question: string, limit = 3): Promise<Match[]> {
  const remote = await retrieveRemote(question, { limit });
  if (remote && remote.matches.length > 0) {
    return remote.matches.map(remoteToMatch);
  }
  return retrieveLocal(question, limit);
}

export function answerFromMatch(question: string, best: Match | undefined): ComplianceAnswer {
  const asked = new Date().toISOString();

  if (!best || best.score < 3) {
    return {
      id: `ans-${Date.now()}`,
      question,
      summary: "I don't have enough information to answer that confidently.",
      bullets: [
        'Try asking about M-Pesa transactions, business documents, eTIMS, VAT or turnover tax.',
      ],
      sourceTitle: '',
      sourceId: '',
      sourceSnapshot: '',
      sourceHeading: '',
      confident: false,
      followUps: [
        'What is the VAT registration threshold for businesses in Kenya?',
        'What is turnover tax?',
        'How do I register for eTIMS?',
      ],
      askedAt: asked,
    };
  }

  return {
    id: `ans-${Date.now()}`,
    question,
    summary: best.chunk.text,
    bullets: best.chunk.bullets,
    sourceTitle: best.doc.title,
    sourceId: best.doc.id,
    sourceSnapshot: best.doc.snapshot,
    sourceHeading: best.chunk.heading,
    confident: true,
    followUps: best.chunk.followUps,
    askedAt: asked,
  };
}

export function answerCompliance(question: string): ComplianceAnswer {
  return answerFromMatch(question, retrieveLocal(question)[0]);
}

export async function answerComplianceAsync(question: string): Promise<ComplianceAnswer> {
  const matches = await retrieve(question);
  return answerFromMatch(question, matches[0]);
}

/** @deprecated Use retrieve() async. Kept for sync call sites using local only. */
export { retrieveLocal as retrieveSync };
