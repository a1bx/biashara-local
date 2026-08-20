import { corpus } from '../data/corpus';
import type { ComplianceAnswer, CorpusChunk, CorpusDocument } from '../types';

export type Intent = 'business-data' | 'compliance' | 'document' | 'unsupported';

const BUSINESS_TERMS = [
'expense', 'expenses', 'income', 'revenue', 'sales', 'paid', 'spend',
'spent', 'cash flow', 'cashflow', 'transaction', 'transactions',
'customer', 'customers', 'counterparty', 'statement', 'balance',
'last month', 'top', 'earn', 'received'];


const DOCUMENT_TERMS = [
'quotation', 'quote', 'draft', 'write a letter', 'create an invoice',
'generate an invoice', 'receipt for', 'supplier letter', 'customer letter'];


const COMPLIANCE_TERMS = [
'vat', 'tax', 'kra', 'etims', 'turnover', 'register', 'registration',
'file', 'filing', 'return', 'compliance', 'penalty', 'pin', 'permit',
'licence', 'license', 'paye', 'threshold', 'invoice requirement'];


const STOP_WORDS = new Set([
'what', 'is', 'the', 'a', 'an', 'for', 'of', 'in', 'to', 'do', 'i',
'my', 'how', 'are', 'and', 'on', 'with', 'me', 'can', 'should', 'does',
'business', 'businesses', 'kenya', 'kenyan']
);

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
  return text.
  toLowerCase().
  replace(/[^a-z0-9\s]/g, ' ').
  split(/\s+/).
  filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

interface Match {
  doc: CorpusDocument;
  chunk: CorpusChunk;
  score: number;
}

/** Local keyword/BM25-style retrieval stand-in for the on-device vector index. */
export function retrieve(question: string, limit = 3): Match[] {
  const tokens = tokenize(question);
  const matches: Match[] = [];

  for (const doc of corpus) {
    for (const chunk of doc.chunks) {
      const haystack = `${doc.title} ${doc.category} ${chunk.heading} ${chunk.text} ${chunk.keywords.join(' ')} ${chunk.bullets.join(' ')}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (chunk.keywords.some((k) => k.includes(token))) score += 3;else
        if (haystack.includes(token)) score += 1;
      }
      for (const keyword of chunk.keywords) {
        if (keyword.includes(' ') && question.toLowerCase().includes(keyword))
        score += 4;
      }
      if (score > 0) matches.push({ doc, chunk, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function answerCompliance(question: string): ComplianceAnswer {
  const matches = retrieve(question);
  const best = matches[0];
  const asked = new Date().toISOString();

  if (!best || best.score < 3) {
    return {
      id: `ans-${Date.now()}`,
      question,
      summary:
      "I don't have enough information to answer that confidently.",
      bullets: [
      'Try asking about M-Pesa transactions, business documents, eTIMS, VAT or turnover tax.'],

      sourceTitle: '',
      sourceId: '',
      sourceSnapshot: '',
      sourceHeading: '',
      confident: false,
      followUps: [
      'What is the VAT registration threshold for businesses in Kenya?',
      'What is turnover tax?',
      'How do I register for eTIMS?'],

      askedAt: asked
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
    askedAt: asked
  };
}

export const SAMPLE_QUESTIONS = [
'What is the VAT registration threshold for businesses in Kenya?',
'What is turnover tax?',
'How do I register for eTIMS?',
'What must a tax invoice contain?',
'What filing obligations apply to me?'];