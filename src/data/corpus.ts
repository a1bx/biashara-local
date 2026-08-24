import generated from './corpus.generated.json';
import type { CorpusDocument } from '../types';

/**
 * Compliance corpus loaded from the build-time index export.
 * Regenerate with: python -m biashara.scripts.build_index --export-json ...
 */
export const corpus: CorpusDocument[] = generated.documents as CorpusDocument[];

export const corpusMeta = generated.meta;

export const corpusCategories = [
  'All',
  'VAT',
  'Turnover Tax',
  'Income Tax',
  'eTIMS',
  'Business Compliance',
];

export const SAMPLE_QUESTIONS = [
  'What is the VAT registration threshold for businesses in Kenya?',
  'What is turnover tax?',
  'How do I register for eTIMS?',
  'What must a tax invoice contain?',
  'What filing obligations apply to me?',
];
