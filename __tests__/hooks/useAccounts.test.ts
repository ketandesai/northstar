import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
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
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes and fetches accounts from /api/accounts on mount', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, accounts: [mockAccount1] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAccounts());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].id).toBe('acc_1');
    expect(mockFetch).toHaveBeenCalledWith('/api/accounts');
  });

  it('adds accounts optimistically and calls POST /api/accounts', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/accounts' && (!init || init.method === undefined)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, accounts: [] }),
        });
      }
      if (url === '/api/accounts' && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, accounts: [mockAccount1] }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAccounts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addAccounts([mockAccount1]);
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].id).toBe('acc_1');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/accounts',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: [mockAccount1] }),
      })
    );
  });

  it('prevents adding duplicate accounts with identical IDs', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/accounts' && (!init || init.method === undefined)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, accounts: [mockAccount1] }),
        });
      }
      if (url === '/api/accounts' && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, accounts: [mockAccount1, mockAccount2] }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAccounts());

    await waitFor(() => {
      expect(result.current.accounts).toHaveLength(1);
    });

    await act(async () => {
      await result.current.addAccounts([mockAccount1, mockAccount2]);
    });

    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts.map((a) => a.id)).toEqual(['acc_1', 'acc_2']);
  });

  it('removes accounts optimistically and calls DELETE /api/accounts/:id', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/accounts' && (!init || init.method === undefined)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, accounts: [mockAccount1, mockAccount2] }),
        });
      }
      if (url.startsWith('/api/accounts/') && init?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, deletedId: 'acc_1' }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAccounts());

    await waitFor(() => {
      expect(result.current.accounts).toHaveLength(2);
    });

    await act(async () => {
      await result.current.removeAccount('acc_1');
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].id).toBe('acc_2');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/accounts/acc_1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('handles fetch error gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Database connection error' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAccounts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.accounts).toEqual([]);
    expect(result.current.error).toContain('Database connection error');
  });

  it('updates an account via PATCH /api/accounts/:id and reconciles state', async () => {
    const updatedAccount = {
      ...mockAccount1,
      name: 'Checking Account (Renamed)',
      balances: { ...mockAccount1.balances, current: 999 },
    };
    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/accounts' && (!init || init.method === undefined)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, accounts: [mockAccount1] }),
        });
      }
      if (url === '/api/accounts/acc_1' && init?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, account: updatedAccount, updated: ['current_balance'] }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAccounts());

    await waitFor(() => {
      expect(result.current.accounts).toHaveLength(1);
    });

    await act(async () => {
      await result.current.updateAccount('acc_1', { currentBalance: 999, name: 'Checking Account (Renamed)' });
    });

    expect(result.current.accounts[0].name).toBe('Checking Account (Renamed)');
    expect(result.current.accounts[0].balances.current).toBe(999);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/accounts/acc_1',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentBalance: 999, name: 'Checking Account (Renamed)' }),
      })
    );
  });

  it('refreshBalances calls POST /api/plaid/refresh-balances then re-fetches accounts', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/accounts') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, accounts: [mockAccount1] }),
        });
      }
      if (url === '/api/plaid/refresh-balances' && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            itemsRefreshed: 1,
            accountsUpdated: 1,
            snapshotsWritten: 1,
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useAccounts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshBalances();
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.lastRefreshedAt).not.toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/api/plaid/refresh-balances', {
      method: 'POST',
    });
  });
});
