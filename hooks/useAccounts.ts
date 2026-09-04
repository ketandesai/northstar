'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectedAccount } from '@/types/account';

export function useAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch on mount with cleanup
  useEffect(() => {
    let isMounted = true;

    async function loadInitialAccounts() {
      try {
        const res = await fetch('/api/accounts');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch accounts (${res.status})`);
        }
        const data = await res.json();
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
    }

    loadInitialAccounts();

    return () => {
      isMounted = false;
    };
  }, []);

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
    addAccounts,
    removeAccount,
    refresh: fetchAccounts,
  };
}
