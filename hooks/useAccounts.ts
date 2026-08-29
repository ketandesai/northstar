'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { ConnectedAccount } from '@/types/account';

const STORAGE_KEY = 'northstar_connected_accounts';
const EVENT_KEY = 'northstar_accounts_updated';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT_KEY, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT_KEY, callback);
  };
}

function getSnapshot(): string {
  if (typeof window === 'undefined') return '[]';
  return localStorage.getItem(STORAGE_KEY) || '[]';
}

function getServerSnapshot(): string {
  return '[]';
}

export function useAccounts() {
  const accountsRaw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let accounts: ConnectedAccount[] = [];
  try {
    accounts = JSON.parse(accountsRaw);
  } catch {
    accounts = [];
  }

  const saveAccounts = useCallback((newAccounts: ConnectedAccount[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAccounts));
      window.dispatchEvent(new Event(EVENT_KEY));
    } catch (e) {
      console.warn('Failed to save accounts to localStorage:', e);
    }
  }, []);

  const addAccounts = useCallback((newAccounts: ConnectedAccount[]) => {
    const existingRaw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || '[]' : '[]';
    let currentAccounts: ConnectedAccount[] = [];
    try {
      currentAccounts = JSON.parse(existingRaw);
    } catch {
      currentAccounts = [];
    }

    const existingIds = new Set(currentAccounts.map((a) => a.id));
    const uniqueNew = newAccounts.filter((a) => !existingIds.has(a.id));
    const updated = [...currentAccounts, ...uniqueNew];
    saveAccounts(updated);
  }, [saveAccounts]);

  const removeAccount = useCallback((accountId: string) => {
    const existingRaw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || '[]' : '[]';
    let currentAccounts: ConnectedAccount[] = [];
    try {
      currentAccounts = JSON.parse(existingRaw);
    } catch {
      currentAccounts = [];
    }

    const updated = currentAccounts.filter((a) => a.id !== accountId);
    saveAccounts(updated);
  }, [saveAccounts]);

  return {
    accounts,
    addAccounts,
    removeAccount,
  };
}
