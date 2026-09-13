import { describe, it, expect } from 'vitest';
import {
  getAccountCategory,
  getEffectiveCategory,
  summarizeAllocations,
  getTotalValue,
} from '@/lib/account-allocation';
import { ConnectedAccount } from '@/types/account';

function makeAccount({
  type,
  subtype = null,
  balance,
}: {
  type: string;
  subtype?: string | null;
  balance: number;
}): ConnectedAccount {
  return {
    id: `acc_${Math.random().toString(36).slice(2, 10)}`,
    name: 'Test Account',
    officialName: 'Test Account',
    mask: '',
    type,
    subtype,
    balances: {
      available: null,
      current: balance,
      isoCurrencyCode: 'USD',
    },
    institution: { id: 'ins_test', name: 'Test Bank' },
  };
}

describe('getAccountCategory', () => {
  it('classifies retirement accounts by subtype', () => {
    for (const subtype of ['401k', 'roth 401k', 'ira', 'roth ira', 'sep ira', 'pension']) {
      expect(
        getAccountCategory(makeAccount({ type: 'investment', subtype, balance: 1000 }))
      ).toBe('retirement');
    }
  });

  it('classifies depository accounts as cash', () => {
    expect(
      getAccountCategory(makeAccount({ type: 'depository', subtype: 'checking', balance: 1000 }))
    ).toBe('cash');
    expect(
      getAccountCategory(makeAccount({ type: 'depository', subtype: 'money market', balance: 1000 }))
    ).toBe('cash');
  });

  it('classifies manual home assets as property', () => {
    expect(getAccountCategory(makeAccount({ type: 'asset', subtype: 'home', balance: 500000 }))).toBe(
      'property'
    );
  });

  it('classifies investment and brokerage accounts as investment', () => {
    expect(getAccountCategory(makeAccount({ type: 'investment', subtype: 'brokerage', balance: 1000 }))).toBe(
      'investment'
    );
    expect(getAccountCategory(makeAccount({ type: 'brokerage', balance: 2000 }))).toBe('investment');
  });

  it('classifies manual investment and private equity assets as investment', () => {
    expect(getAccountCategory(makeAccount({ type: 'asset', subtype: 'investment', balance: 3000 }))).toBe(
      'investment'
    );
    expect(
      getAccountCategory(makeAccount({ type: 'asset', subtype: 'private_equity', balance: 3000 }))
    ).toBe('investment');
  });

  it('classifies credit cards and loans as credit', () => {
    expect(getAccountCategory(makeAccount({ type: 'asset', subtype: 'car', balance: 40000 }))).toBe('other');
    expect(getAccountCategory(makeAccount({ type: 'credit', subtype: 'credit card', balance: 2000 }))).toBe(
      'credit'
    );
    expect(getAccountCategory(makeAccount({ type: 'loan', subtype: 'student', balance: 5000 }))).toBe('credit');
  });

  it('prefers a stored category over the derived one', () => {
    const account = makeAccount({ type: 'depository', subtype: 'checking', balance: 2500 });
    expect(getEffectiveCategory(account)).toBe('cash');
    expect(getEffectiveCategory({ ...account, category: 'retirement' })).toBe('retirement');
    expect(getEffectiveCategory({ ...account, category: null })).toBe('cash');
  });
});

describe('summarizeAllocations', () => {
  it('sums positive balances by category in canonical order', () => {
    const accounts = [
      makeAccount({ type: 'investment', subtype: '401k', balance: 100000 }),
      makeAccount({ type: 'depository', subtype: 'checking', balance: 10000 }),
      makeAccount({ type: 'depository', subtype: 'savings', balance: 5000 }),
      makeAccount({ type: 'asset', subtype: 'home', balance: 400000 }),
      makeAccount({ type: 'asset', subtype: 'home', balance: 200000 }),
      makeAccount({ type: 'investment', subtype: 'brokerage', balance: 60000 }),
      makeAccount({ type: 'asset', subtype: 'car', balance: 30000 }),
    ];

    const slices = summarizeAllocations(accounts);

    expect(slices.map((s) => s.key)).toEqual([
      'retirement',
      'cash',
      'property',
      'investment',
      'other',
    ]);
    expect(slices.find((s) => s.key === 'retirement')!.value).toBe(100000);
    expect(slices.find((s) => s.key === 'cash')!.value).toBe(15000);
    expect(slices.find((s) => s.key === 'property')!.value).toBe(600000);
    expect(slices.find((s) => s.key === 'property')!.count).toBe(2);
    expect(slices.find((s) => s.key === 'investment')!.value).toBe(60000);
    expect(slices.find((s) => s.key === 'other')!.value).toBe(30000);
    expect(getTotalValue(slices)).toBe(805000);
  });

  it('excludes credit card accounts', () => {
    const slices = summarizeAllocations([
      makeAccount({ type: 'credit', subtype: 'credit card', balance: 2000 }),
      makeAccount({ type: 'depository', subtype: 'checking', balance: 5000 }),
    ]);
    expect(slices.find((s) => s.key === 'other')).toBeUndefined();
    expect(getTotalValue(slices)).toBe(5000);
  });

  it('excludes negative balances', () => {
    const slices = summarizeAllocations([
      makeAccount({ type: 'loan', subtype: 'mortgage', balance: -250000 }),
      makeAccount({ type: 'depository', subtype: 'checking', balance: 8000 }),
    ]);
    expect(slices.find((s) => s.key === 'other')).toBeUndefined();
    expect(getTotalValue(slices)).toBe(8000);
  });

  it('excludes credit category liabilities even with a positive balance', () => {
    const slices = summarizeAllocations([
      makeAccount({ type: 'loan', subtype: 'student', balance: 5000 }),
      makeAccount({ type: 'depository', subtype: 'checking', balance: 8000 }),
    ]);
    expect(slices.find((s) => s.key === 'credit')).toBeUndefined();
    expect(getTotalValue(slices)).toBe(8000);
  });

  it('rebuckets accounts that carry a stored category', () => {
    const slices = summarizeAllocations([
      { ...makeAccount({ type: 'depository', subtype: 'checking', balance: 5000 }), category: 'retirement' },
      makeAccount({ type: 'depository', subtype: 'savings', balance: 3000 }),
    ]);
    expect(slices.find((s) => s.key === 'retirement')!.value).toBe(5000);
    expect(slices.find((s) => s.key === 'cash')!.value).toBe(3000);
  });

  it('excludes zero balance accounts', () => {
    const slices = summarizeAllocations([makeAccount({ type: 'depository', subtype: 'checking', balance: 0 })]);
    expect(slices).toHaveLength(0);
    expect(getTotalValue(slices)).toBe(0);
  });

  it('omits empty categories', () => {
    const slices = summarizeAllocations([
      makeAccount({ type: 'depository', subtype: 'checking', balance: 100 }),
    ]);
    expect(slices.map((s) => s.key)).toEqual(['cash']);
  });
});