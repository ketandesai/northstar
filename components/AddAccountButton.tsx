'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOnExit } from 'react-plaid-link';
import { Plus, Loader2, Landmark, AlertCircle } from 'lucide-react';
import { ConnectedAccount } from '@/types/account';

interface AddAccountButtonProps {
  onAccountsAdded?: (accounts: ConnectedAccount[]) => void;
  variant?: 'primary' | 'secondary' | 'compact';
  className?: string;
}

export default function AddAccountButton({
  onAccountsAdded,
  variant = 'primary',
  className = '',
}: AddAccountButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState<boolean>(false);
  const [isExchanging, setIsExchanging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Link Token from API
  const generateLinkToken = useCallback(async () => {
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

  // Pre-fetch token asynchronously on mount
  useEffect(() => {
    let isMounted = true;
    async function initToken() {
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
    initToken();
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

        if (data.accounts && onAccountsAdded) {
          const timestamp = new Date().toISOString();
          const accountsWithTimestamp = data.accounts.map((acc: ConnectedAccount) => ({
            ...acc,
            connectedAt: timestamp,
          }));
          onAccountsAdded(accountsWithTimestamp);
        }

        // Generate fresh link token for subsequent links
        generateLinkToken();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to complete bank account connection';
        console.error('Error exchanging public token:', err);
        setErrorMessage(msg);
      } finally {
        setIsExchanging(false);
      }
    },
    [onAccountsAdded, generateLinkToken]
  );

  const onExit = useCallback<PlaidLinkOnExit>((error) => {
    if (error) {
      console.warn('Plaid Link exited with error:', error);
      setErrorMessage(error.display_message || error.error_message || 'Plaid connection canceled');
    }
  }, []);

  // Plaid Hook
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
  });

  const handleClick = async () => {
    setErrorMessage(null);
    if (ready) {
      open();
    } else {
      const token = await generateLinkToken();
      if (!token) {
        return;
      }
      // Ready state updates with token on next render
    }
  };

  const isBusy = loadingToken || isExchanging;

  // Base styling variants
  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow active:scale-[0.98]',
    secondary:
      'bg-zinc-900 hover:bg-zinc-800 text-white font-medium dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-sm',
    compact:
      'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60 text-sm font-medium border border-blue-200 dark:border-blue-800/60',
  };

  const sizeStyles =
    variant === 'compact' ? 'px-3.5 py-1.5 rounded-lg text-sm' : 'px-5 py-2.5 rounded-xl text-base';

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy}
        className={`inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles} ${className}`}
      >
        {isBusy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span>{isExchanging ? 'Connecting Account...' : 'Loading Plaid...'}</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <Landmark className="w-4 h-4 opacity-80" />
            <span>Add Account</span>
          </>
        )}
      </button>

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-md">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
