import type {
  BusinessProfile,
  Statement,
  StoredFile,
  Transaction,
  TransactionType } from
'../types';

/**
 * Synthetic demo dataset for a fictional Kenyan SME.
 * No real financial information is used.
 */

export const demoBusiness: BusinessProfile = {
  name: 'Jirani Solutions Ltd',
  address: 'P.O Box 12345, Ngong Road, Nairobi, Kenya',
  kraPin: 'A012345678Z',
  phone: '+254 712 345 678',
  email: 'accounts@jiranisolutions.co.ke'
};

const CUSTOMERS = [
'Mama Njeri Hardware',
'Karen Dental Clinic',
'Westlands Cafe Ltd',
'Ruiru Agrovet',
'Thika Road Motors',
'Kilimani Apartments',
'Green Valley School'];


const SUPPLIERS = [
'Safaricom PLC',
'KCB Bank',
'Supplier ABC Ltd',
'Naivas Supermarket',
'Nairobi Water',
'Kenya Power',
'ABC Supplies Ltd'];


const MONTH_TARGETS: Array<{
  key: string;
  days: number;
  income: number;
  expenses: number;
  count: number;
}> = [
{ key: '2026-03', days: 31, income: 892400, expenses: 641500, count: 268 },
{ key: '2026-04', days: 30, income: 958100, expenses: 702800, count: 279 },
{ key: '2026-05', days: 31, income: 1041300, expenses: 736900, count: 291 },
{ key: '2026-06', days: 30, income: 1053700, expenses: 812400, count: 296 },
{ key: '2026-07', days: 31, income: 1180200, expenses: 840600, count: 305 },
{ key: '2026-08', days: 31, income: 1245600, expenses: 872300, count: 312 }];


function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function receiptCode(rand: () => number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < 10; i += 1) {
    out += chars[Math.floor(rand() * chars.length)];
  }
  return out;
}

function distribute(
total: number,
parts: number,
rand: () => number)
: number[] {
  const weights = Array.from({ length: parts }, () => 0.4 + rand() * 1.6);
  const sum = weights.reduce((s, w) => s + w, 0);
  const values = weights.map((w) => Math.round(total * w / sum / 50) * 50);
  const drift = total - values.reduce((s, v) => s + v, 0);
  values[values.length - 1] += drift;
  return values;
}

function buildMonth(
target: (typeof MONTH_TARGETS)[number],
seed: number,
openingBalance: number)
: {transactions: Transaction[];closingBalance: number;} {
  const rand = mulberry32(seed);
  const incomeCount = Math.round(target.count * 0.45);
  const expenseCount = target.count - incomeCount;
  const incomeValues = distribute(target.income, incomeCount, rand);
  const expenseValues = distribute(target.expenses, expenseCount, rand);

  const raw: Array<Omit<Transaction, 'balance' | 'id'>> = [];

  const pushTx = (
  amount: number,
  direction: 'in' | 'out',
  index: number)
  : void => {
    const day = 1 + Math.floor(rand() * target.days);
    const hour = 7 + Math.floor(rand() * 13);
    const minute = Math.floor(rand() * 60);
    const date = `${target.key}-${`${day}`.padStart(2, '0')}`;
    const time = `${`${hour}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}`;

    if (direction === 'in') {
      const counterparty = CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)];
      const type: TransactionType = rand() > 0.85 ? 'Deposit' : 'Received';
      raw.push({
        receipt: receiptCode(rand),
        date,
        time,
        description:
        type === 'Deposit' ?
        `Cash deposit at agent 402${index % 10}` :
        `Payment from ${counterparty}`,
        counterparty: type === 'Deposit' ? 'Agent Deposit' : counterparty,
        type,
        direction,
        amount
      });
      return;
    }

    const weightedSupplier = (): string => {
      const r = rand();
      if (r < 0.24) return 'Safaricom PLC';
      if (r < 0.43) return 'KCB Bank';
      if (r < 0.58) return 'Supplier ABC Ltd';
      if (r < 0.68) return 'Naivas Supermarket';
      if (r < 0.79) return 'Kenya Power';
      if (r < 0.9) return 'Nairobi Water';
      return 'ABC Supplies Ltd';
    };
    const counterparty = weightedSupplier();
    const r = rand();
    const type: TransactionType =
    r < 0.12 ? 'Withdrawal' : r < 0.55 ? 'Payment' : 'Sent';
    raw.push({
      receipt: receiptCode(rand),
      date,
      time,
      description:
      type === 'Withdrawal' ?
      `Withdrawal at agent 118${index % 10}` :
      `${type === 'Payment' ? 'Pay bill to' : 'Sent to'} ${counterparty}`,
      counterparty: type === 'Withdrawal' ? 'Agent Withdrawal' : counterparty,
      type,
      direction,
      amount
    });
  };

  incomeValues.forEach((v, i) => pushTx(v, 'in', i));
  expenseValues.forEach((v, i) => pushTx(v, 'out', i));

  raw.sort((a, b) =>
  `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );

  let balance = openingBalance;
  const transactions: Transaction[] = raw.map((t, i) => {
    balance += t.direction === 'in' ? t.amount : -t.amount;
    return {
      ...t,
      id: `${target.key}-${i}`,
      balance: Math.round(balance)
    };
  });

  return { transactions, closingBalance: balance };
}

function importedAt(key: string, index: number): string {
  if (index === MONTH_TARGETS.length - 1) {
    return new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  }
  const [year, month] = key.split('-').map(Number);
  const last = new Date(year, month, 0, 18, 30);
  return last.toISOString();
}

export function buildDemoStatements(): Statement[] {
  let balance = 148_500;
  return MONTH_TARGETS.map((target, index) => {
    const { transactions, closingBalance } = buildMonth(
      target,
      1000 + index * 37,
      balance
    );
    balance = closingBalance;
    const [year, month] = target.key.split('-');
    const label = `${
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
    Number(month) - 1]} ${

    year}`;
    return {
      id: `stmt-${target.key}`,
      name: `M-Pesa Statement — ${label}`,
      periodLabel: label,
      fileName: `mpesa-statement-${target.key}.csv`,
      importedAt: importedAt(target.key, index),
      status: 'Parsed',
      transactions
    };
  });
}

export const demoStoredFiles: StoredFile[] = [
{
  id: 'file-guide-etims',
  name: 'KRA eTIMS Onboarding Guide.pdf',
  category: 'Compliance Sources',
  type: 'PDF',
  createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  modifiedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  status: 'Source'
},
{
  id: 'file-guide-vat',
  name: 'KRA VAT Guide for Taxpayers.pdf',
  category: 'Compliance Sources',
  type: 'PDF',
  createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
  modifiedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
  status: 'Source'
}];