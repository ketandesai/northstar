'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectedAccount, AccountCategory } from '@/types/account';

export function useAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  // Manual refresh helper
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch accounts (${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        setError(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error loading accounts';
      console.warn('Unable to load accounts from database:', msg);
      setError(msg);
    }
  }, []);

  // Refresh the latest balances from Plaid, then re-read the stored accounts.
  const refreshBalances = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/plaid/refresh-balances', { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to refresh balances (${res.status})`);
      }
      setLastRefreshedAt(new Date().toISOString());
      await fetchAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh balances';
      console.error('Error refreshing balances from Plaid:', msg);
      setError(msg);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAccounts]);

  // Initial fetch on mount with cleanup
  useEffect(() => {
    let isMounted = true;

    async function loadInitialAccounts() {
      let loadedAccounts: ConnectedAccount[] = [];
      try {
        const res = await fetch('/api/accounts');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch accounts (${res.status})`);
        }
        const data = await res.json();
        if (Array.isArray(data.accounts)) {
          loadedAccounts = data.accounts;
        }
        if (isMounted && Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Unknown error loading accounts';
          console.warn('Unable to load accounts from database:', msg);
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }

      // If the newest stored balance is older than ~24h, refresh from Plaid so
      // the dashboard stays current even before the next daily cron run.
      if (!isMounted || loadedAccounts.length === 0) return;
      const newestUpdatedAt = loadedAccounts.reduce<number | null>((latest, acc) => {
        if (!acc.updatedAt) return latest;
        const t = new Date(acc.updatedAt).getTime();
        return latest === null || t > latest ? t : latest;
      }, null);
      if (newestUpdatedAt === null) return;
      if (Date.now() - newestUpdatedAt > 24 * 60 * 60 * 1000) {
        refreshBalances().catch(() => {});
      }
    }

    loadInitialAccounts();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist new accounts to PostgreSQL
  const addAccounts = useCallback(
    async (newAccounts: ConnectedAccount[]) => {
      if (!newAccounts || newAccounts.length === 0) return;

      // Optimistic update
      setAccounts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const unique = newAccounts.filter((a) => !existingIds.has(a.id));
        return [...prev, ...unique];
      });

      try {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accounts: newAccounts }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to persist accounts to database');
        }

        const data = await res.json();
        if (Array.isArray(data.accounts)) {
          // Sync with server-persisted accounts
          setAccounts((prev) => {
            const serverMap = new Map<string, ConnectedAccount>(
              data.accounts.map((acc: ConnectedAccount) => [acc.id, acc])
            );
            return prev.map((acc) => serverMap.get(acc.id) || acc);
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save accounts';
        console.error('Error saving accounts to PostgreSQL:', msg);
        setError(msg);
      }
    },
    []
  );

  // Update an account (e.g. revalue a manual asset) in PostgreSQL
  const updateAccount = useCallback(
    async (
      accountId: string,
      patch: {
        name?: string;
        type?: string;
        subtype?: string;
        category?: AccountCategory;
        currentBalance?: number | null;
        isoCurrencyCode?: string;
      }
    ) => {
      if (!accountId) return;

      // Optimistic update
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === accountId
            ? {
                ...acc,
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.type !== undefined ? { type: patch.type } : {}),
                ...(patch.subtype !== undefined ? { subtype: patch.subtype } : {}),
                ...(patch.category !== undefined ? { category: patch.category } : {}),
                ...(patch.isoCurrencyCode !== undefined
                  ? {
                      balances: {
                        ...acc.balances,
                        isoCurrencyCode: patch.isoCurrencyCode,
                      },
                    }
                  : {}),
                ...(patch.currentBalance !== undefined
                  ? {
                      balances: {
                        ...acc.balances,
                        current: patch.currentBalance,
                        available: null,
                      },
                    }
                  : {}),
                updatedAt: new Date().toISOString(),
              }
            : acc
        )
      );

      try {
        const res = await fetch(`/api/accounts/${encodeURIComponent(accountId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update account in database');
        }

        const data = await res.json();
        if (data?.account) {
          setAccounts((prev) =>
            prev.map((acc) => (acc.id === accountId ? data.account : acc))
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update account';
        console.error('Error updating account in PostgreSQL:', msg);
        setError(msg);
      }
    },
    []
  );

  // Remove account by ID from PostgreSQL
  const removeAccount = useCallback(async (accountId: string) => {
    if (!accountId) return;

    // Optimistic removal
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));

    try {
      const res = await fetch(`/api/accounts/${encodeURIComponent(accountId)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete account from database');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      console.error('Error deleting account from PostgreSQL:', msg);
      setError(msg);
    }
  }, []);

  return {
    accounts,
    loading,
    error,
    isRefreshing,
    lastRefreshedAt,
    addAccounts,
    updateAccount,
    removeAccount,
    refresh: fetchAccounts,
    refreshBalances,
  };
}
