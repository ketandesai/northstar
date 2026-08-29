import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccounts } from '@/hooks/useAccounts';
import { ConnectedAccount } from '@/types/account';

const mockAccount1: ConnectedAccount = {
  id: 'acc_1',
  name: 'Checking Account',
  officialName: 'Premier Checking',
  mask: '1234',
  type: 'depository',
  subtype: 'checking',
  balances: {
    available: 500,
    current: 550,
    isoCurrencyCode: 'USD',
  },
  institution: {
    id: 'ins_chase',
    name: 'Chase',
  },
};

const mockAccount2: ConnectedAccount = {
  id: 'acc_2',
  name: 'Savings Account',
  officialName: 'High Yield Savings',
  mask: '5678',
  type: 'depository',
  subtype: 'savings',
  balances: {
    available: 10000,
    current: 10000,
    isoCurrencyCode: 'USD',
  },
  institution: {
    id: 'ins_chase',
    name: 'Chase',
  },
};

describe('useAccounts hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with empty accounts list', () => {
    const { result } = renderHook(() => useAccounts());
    expect(result.current.accounts).toEqual([]);
  });

  it('adds accounts and saves to localStorage', () => {
    const { result } = renderHook(() => useAccounts());

    act(() => {
      result.current.addAccounts([mockAccount1]);
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].id).toBe('acc_1');

    const stored = JSON.parse(localStorage.getItem('northstar_connected_accounts') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('acc_1');
  });

  it('prevents adding duplicate accounts with identical IDs', () => {
    const { result } = renderHook(() => useAccounts());

    act(() => {
      result.current.addAccounts([mockAccount1]);
    });

    act(() => {
      result.current.addAccounts([mockAccount1, mockAccount2]);
    });

    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts.map((a) => a.id)).toEqual(['acc_1', 'acc_2']);
  });

  it('removes accounts by ID', () => {
    const { result } = renderHook(() => useAccounts());

    act(() => {
      result.current.addAccounts([mockAccount1, mockAccount2]);
    });

    expect(result.current.accounts).toHaveLength(2);

    act(() => {
      result.current.removeAccount('acc_1');
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].id).toBe('acc_2');

    const stored = JSON.parse(localStorage.getItem('northstar_connected_accounts') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('acc_2');
  });
});
