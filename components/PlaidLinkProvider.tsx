'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOnExit } from 'react-plaid-link';
import { ConnectedAccount } from '@/types/account';

interface PlaidLinkContextValue {
  open: () => void;
  ready: boolean;
  isBusy: boolean;
  errorMessage: string | null;
  fetchLinkToken: () => Promise<string | null>;
  setOnAccountsAdded: (callback?: (accounts: ConnectedAccount[]) => void) => void;
}

const PlaidLinkContext = createContext<PlaidLinkContextValue | null>(null);

export function PlaidLinkProvider({ children }: { children: React.ReactNode }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState<boolean>(false);
  const [isExchanging, setIsExchanging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const onAccountsAddedRef = useRef<((accounts: ConnectedAccount[]) => void) | undefined>(undefined);

  const setOnAccountsAdded = useCallback((callback?: (accounts: ConnectedAccount[]) => void) => {
    onAccountsAddedRef.current = callback;
  }, []);

  // Fetch Link Token from API
  const fetchLinkToken = useCallback(async () => {
    setLoadingToken(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize Plaid Link');
      }

      setLinkToken(data.link_token);
      return data.link_token as string;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to Plaid';
      console.error('Error getting Plaid Link Token:', err);
      setErrorMessage(msg);
      return null;
    } finally {
      setLoadingToken(false);
    }
  }, []);

  // Silently pre-fetch token asynchronously on mount
  useEffect(() => {
    let isMounted = true;
    async function preFetchToken() {
      try {
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (isMounted && response.ok && data.link_token) {
          setLinkToken(data.link_token);
        }
      } catch {
        // Silently handled on mount; user will see notice if clicked
      }
    }
    preFetchToken();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle successful account linking in Plaid modal
  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      setIsExchanging(true);
      setErrorMessage(null);
      try {
        const response = await fetch('/api/plaid/exchange-public-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata.institution
              ? {
                  id: metadata.institution.institution_id || 'plaid_bank',
                  name: metadata.institution.name,
                }
              : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to exchange token and fetch accounts');
        }

        if (data.accounts && onAccountsAddedRef.current) {
          const timestamp = new Date().toISOString();
          const accountsWithTimestamp = data.accounts.map((acc: ConnectedAccount) => ({
            ...acc,
            connectedAt: timestamp,
          }));
          onAccountsAddedRef.current(accountsWithTimestamp);
        }

        // Generate fresh link token for subsequent links
        fetchLinkToken();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to complete bank account connection';
        console.error('Error exchanging public token:', err);
        setErrorMessage(msg);
      } finally {
        setIsExchanging(false);
      }
    },
    [fetchLinkToken]
  );

  const onExit = useCallback<PlaidLinkOnExit>((error) => {
    if (error) {
      console.warn('Plaid Link exited with error:', error);
      setErrorMessage(error.display_message || error.error_message || 'Plaid connection canceled');
    }
  }, []);

  // Plaid Hook — invoked exactly once per page, shared by all consumers
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
  });

  const value = useMemo(
    () => ({
      open,
      ready,
      isBusy: loadingToken || isExchanging,
      errorMessage,
      fetchLinkToken,
      setOnAccountsAdded,
    }),
    [open, ready, loadingToken, isExchanging, errorMessage, fetchLinkToken, setOnAccountsAdded]
  );

  return <PlaidLinkContext.Provider value={value}>{children}</PlaidLinkContext.Provider>;
}

export function usePlaidLinkContext(): PlaidLinkContextValue {
  const ctx = useContext(PlaidLinkContext);
  if (!ctx) {
    throw new Error('usePlaidLinkContext must be used within a PlaidLinkProvider');
  }
  return ctx;
}