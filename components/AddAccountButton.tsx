'use client';

import React, { useEffect } from 'react';
import { Plus, Loader2, Landmark, AlertCircle } from 'lucide-react';
import { ConnectedAccount } from '@/types/account';
import { usePlaidLinkContext } from './PlaidLinkProvider';

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
  const { open, ready, isBusy, errorMessage, fetchLinkToken, setOnAccountsAdded } =
    usePlaidLinkContext();

  // Register this button's callback with the shared Plaid provider
  useEffect(() => {
    setOnAccountsAdded(onAccountsAdded);
    return () => {
      setOnAccountsAdded(undefined);
    };
  }, [onAccountsAdded, setOnAccountsAdded]);

  const handleClick = async () => {
    if (ready) {
      open();
    } else {
      await fetchLinkToken();
    }
  };

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
            <span>{'Loading Plaid...'}</span>
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