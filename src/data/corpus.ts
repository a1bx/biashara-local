import type { CorpusDocument } from '../types';

/**
 * Curated local compliance corpus. Bundled with the app and indexed on device —
 * the application never fetches live tax information from the internet.
 */
export const corpus: CorpusDocument[] = [
{
  id: 'kra-vat-guide',
  title: 'KRA VAT Guide for Taxpayers',
  category: 'VAT',
  docType: 'Guide (PDF)',
  snapshot: 'May 2024',
  status: 'Indexed',
  chunks: [
  {
    id: 'vat-threshold',
    heading: 'VAT registration threshold',
    text: 'A person whose taxable supplies exceed or are expected to exceed KES 5,000,000 in any rolling twelve month period is required to register for VAT.',
    keywords: [
    'vat',
    'registration',
    'threshold',
    'register',
    'turnover',
    '5 million',
    'taxable supplies'],

    bullets: [
    'The VAT registration threshold is KES 5,000,000 of taxable supplies in any rolling 12-month period.',
    'Registration is required within 30 days of exceeding the threshold.',
    'Voluntary registration is possible below the threshold.',
    'The standard VAT rate is 16%; some supplies are zero-rated or exempt.'],

    followUps: [
    'What are VATable supplies?',
    'How do I register for eTIMS?',
    'What filing obligations apply to me?']

  },
  {
    id: 'vat-supplies',
    heading: 'Taxable, zero-rated and exempt supplies',
    text: 'Taxable supplies are goods and services supplied in Kenya that attract VAT at the standard or zero rate. Exempt supplies do not attract VAT and do not count toward the registration threshold.',
    keywords: [
    'vatable',
    'taxable',
    'supplies',
    'zero rated',
    'exempt',
    'standard rate',
    '16%'],

    bullets: [
    'Standard-rated supplies attract VAT at 16%.',
    'Zero-rated supplies (such as exports) are taxable at 0% and allow input VAT recovery.',
    'Exempt supplies attract no VAT and are excluded from the registration threshold.',
    'Only taxable supplies count toward the KES 5,000,000 threshold.'],

    followUps: [
    'What is the VAT registration threshold for businesses in Kenya?',
    'What must a tax invoice contain?']

  },
  {
    id: 'vat-returns',
    heading: 'VAT returns and payment',
    text: 'Registered persons file a VAT return on iTax for each tax period and pay any VAT due.',
    keywords: ['vat return', 'file', 'due date', 'payment', 'itax', '20th'],
    bullets: [
    'VAT returns are filed monthly on iTax.',
    'The return and payment are due by the 20th of the following month.',
    'A nil return must be filed for periods with no supplies.',
    'Late filing and late payment attract penalties and interest.'],

    followUps: [
    'What filing obligations apply to me?',
    'What is turnover tax?']

  }]

},
{
  id: 'kra-tot-guide',
  title: 'Turnover Tax Guide for Small Businesses',
  category: 'Turnover Tax',
  docType: 'Guide (PDF)',
  snapshot: 'Jan 2024',
  status: 'Indexed',
  chunks: [
  {
    id: 'tot-basics',
    heading: 'Turnover tax basics',
    text: 'Turnover tax is a simplified tax payable by resident persons whose gross turnover falls within the prescribed band.',
    keywords: [
    'turnover tax',
    'tot',
    'small business',
    'gross turnover',
    'simplified'],

    bullets: [
    'Turnover tax is a simplified tax on gross monthly sales, with no deduction of expenses.',
    'It applies to resident businesses whose annual turnover falls within the prescribed band and who are not VAT registered.',
    'Returns are filed and paid monthly, by the 20th of the following month.',
    'Businesses above the band move to normal income tax and, where applicable, VAT.'],

    followUps: [
    'What is the VAT registration threshold for businesses in Kenya?',
    'What filing obligations apply to me?']

  }]

},
{
  id: 'kra-etims-guide',
  title: 'eTIMS Onboarding Guide',
  category: 'eTIMS',
  docType: 'Guide (PDF)',
  snapshot: 'Mar 2024',
  status: 'Indexed',
  chunks: [
  {
    id: 'etims-register',
    heading: 'Registering for eTIMS',
    text: 'Businesses generate electronic tax invoices through eTIMS. Onboarding is done through the eTIMS taxpayer portal using the KRA PIN.',
    keywords: [
    'etims',
    'register',
    'onboard',
    'electronic invoice',
    'tims',
    'sign up'],

    bullets: [
    'Sign up on the eTIMS taxpayer portal using your KRA PIN and iTax credentials.',
    'Choose the eTIMS solution that fits your business (mobile, client software, or online portal).',
    'Upload the required identification documents and wait for approval.',
    'Once approved, all invoices to other businesses must be generated through eTIMS.'],

    followUps: [
    'What must a tax invoice contain?',
    'What is the VAT registration threshold for businesses in Kenya?']

  },
  {
    id: 'etims-invoice',
    heading: 'Electronic tax invoice requirements',
    text: 'An electronic tax invoice must carry the seller and buyer details, invoice number, date, description of supply, taxable value, tax rate and the eTIMS control unit information.',
    keywords: [
    'invoice',
    'tax invoice',
    'requirements',
    'contain',
    'receipt',
    'control unit',
    'qr code'],

    bullets: [
    'Include the seller name, address and KRA PIN, and the buyer PIN where applicable.',
    'Include a unique invoice number, date and time of supply.',
    'Show the description, quantity, unit price and taxable value per item.',
    'Show the tax rate, VAT amount and total, plus the eTIMS control number and QR code.'],

    followUps: [
    'How do I register for eTIMS?',
    'What are VATable supplies?']

  }]

},
{
  id: 'kra-filing-calendar',
  title: 'Filing Obligations Calendar',
  category: 'Business Compliance',
  docType: 'Reference (PDF)',
  snapshot: 'Feb 2024',
  status: 'Indexed',
  chunks: [
  {
    id: 'filing-obligations',
    heading: 'Common filing obligations',
    text: 'Filing obligations depend on the tax obligations registered against the KRA PIN.',
    keywords: [
    'filing',
    'obligations',
    'deadline',
    'due',
    'returns',
    'paye',
    'annual'],

    bullets: [
    'VAT: monthly return and payment by the 20th of the following month.',
    'Turnover tax: monthly return and payment by the 20th of the following month.',
    'PAYE (if you have employees): monthly by the 9th of the following month.',
    'Company income tax return: within six months of the accounting year end.'],

    followUps: [
    'What is turnover tax?',
    'What is the VAT registration threshold for businesses in Kenya?']

  }]

},
{
  id: 'brs-registration',
  title: 'Business Registration Requirements',
  category: 'Business Compliance',
  docType: 'Guide (PDF)',
  snapshot: 'Nov 2023',
  status: 'Indexed',
  chunks: [
  {
    id: 'registration-steps',
    heading: 'Registering a business',
    text: 'Business names and companies are registered through the eCitizen Business Registration Service.',
    keywords: [
    'register',
    'business',
    'company',
    'ecitizen',
    'business name',
    'permit',
    'licence'],

    bullets: [
    'Reserve a name and register the business or company on eCitizen (BRS).',
    'Apply for a KRA PIN for the registered entity.',
    'Obtain the county single business permit for your trading location.',
    'Register any additional tax obligations that apply, such as VAT or PAYE.'],

    followUps: [
    'What filing obligations apply to me?',
    'How do I register for eTIMS?']

  }]

},
{
  id: 'kra-income-tax',
  title: 'Income Tax Basics for Small Business',
  category: 'Income Tax',
  docType: 'Guide (PDF)',
  snapshot: 'Jan 2024',
  status: 'Indexed',
  chunks: [
  {
    id: 'income-tax-basics',
    heading: 'Income tax for small businesses',
    text: 'Business income is taxed on profits after allowable expenses. Companies pay corporation tax while sole proprietors are taxed at individual rates.',
    keywords: [
    'income tax',
    'corporation tax',
    'profit',
    'expenses',
    'sole proprietor',
    'instalment'],

    bullets: [
    'Taxable profit is business income less allowable business expenses.',
    'Resident companies pay corporation tax on profits; sole proprietors are taxed at graduated individual rates.',
    'Keep records and supporting documents for at least five years.',
    'Instalment tax may apply where the annual tax liability exceeds the prescribed amount.'],

    followUps: [
    'What is turnover tax?',
    'What filing obligations apply to me?']

  }]

}];


export const corpusCategories = [
'All',
'VAT',
'Turnover Tax',
'Income Tax',
'eTIMS',
'Business Compliance'];