import { ConnectedAccount, isManualAsset } from '@/types/account';

export type AccountCategory =
  | 'retirement'
  | 'cash'
  | 'property'
  | 'investment'
  | 'other';

export const CATEGORY_LABELS: Record<AccountCategory, string> = {
  retirement: 'Retirement',
  cash: 'Cash',
  property: 'Property',
  investment: 'Investment',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<AccountCategory, string> = {
  retirement: '#2563eb',
  cash: '#10b981',
  property: '#0ea5e9',
  investment: '#8b5cf6',
  other: '#71717a',
};

const RETIREMENT_SUBTYPES = new Set([
  '401a',
  '401k',
  '403b',
  '457b',
  'ira',
  'keogh',
  'lira',
  'lrif',
  'lrsp',
  'money purchase plan',
  'money_purchase_plan',
  'pension',
  'profit sharing plan',
  'profit_sharing_plan',
  'retirement',
  'roth',
  'roth 401a',
  'roth 401k',
  'roth 403b',
  'roth 457',
  'roth ira',
  'roth lrif',
  'roth lrsp',
  'rrif',
  'rrsp',
  'sarsep',
  'sep ira',
  'simple ira',
  'sipp',
  'thrift savings plan',
  'thrift_savings_plan',
]);

const normalized = new Set(
  [...RETIREMENT_SUBTYPES].map((s) => s.toLowerCase().replace(/[_\s]+/g, ' ').trim())
);

function isRetirementSubtype(subtype: string | null): boolean {
  if (!subtype) return false;
  const key = subtype.toLowerCase().replace(/[_\s]+/g, ' ').trim();
  return normalized.has(key);
}

/**
 * Buckets an account into Retirement / Cash / Property / Investment / Other.
 * Credit card accounts are intentionally excluded from the breakdown.
 */
export function getAccountCategory(account: ConnectedAccount): AccountCategory {
  if (account.type === 'credit') return 'other';

  if (isManualAsset(account)) {
    if (account.subtype === 'home') return 'property';
    if (account.subtype === 'investment' || account.subtype === 'private_equity') {
      return 'investment';
    }
    return 'other';
  }

  if (account.type === 'depository') return 'cash';

  if (account.type === 'investment' || account.type === 'brokerage') {
    return isRetirementSubtype(account.subtype) ? 'retirement' : 'investment';
  }

  return 'other';
}

export interface AllocationSlice {
  key: AccountCategory;
  label: string;
  value: number;
  count: number;
  color: string;
}

export function getAccountBalance(account: ConnectedAccount): number {
  return account.balances.current ?? account.balances.available ?? 0;
}

/**
 * Sums positive, non-credit account balances per category. Negative
 * liabilities and credit cards are excluded from the allocation.
 */
export function summarizeAllocations(accounts: ConnectedAccount[]): AllocationSlice[] {
  const totals = new Map<AccountCategory, number>();
  const counts = new Map<AccountCategory, number>();

  for (const account of accounts) {
    if (account.type === 'credit') continue;
    const balance = getAccountBalance(account);
    if (balance <= 0) continue;

    const category = getAccountCategory(account);
    totals.set(category, (totals.get(category) ?? 0) + balance);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const order: AccountCategory[] = ['retirement', 'cash', 'property', 'investment', 'other'];
  const slices: AllocationSlice[] = [];
  for (const key of order) {
    const value = totals.get(key) ?? 0;
    const count = counts.get(key) ?? 0;
    if (value > 0) {
      slices.push({
        key,
        label: CATEGORY_LABELS[key],
        value,
        count,
        color: CATEGORY_COLORS[key],
      });
    }
  }
  return slices;
}

export function getTotalValue(slices: AllocationSlice[]): number {
  return slices.reduce((sum, s) => sum + s.value, 0);
}