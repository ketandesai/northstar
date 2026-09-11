'use client';

import React, { useEffect } from 'react';
import { Plus, Landmark, AlertCircle } from 'lucide-react';
import { ConnectedAccount } from '@/types/account';
import { usePlaidLinkContext } from './PlaidLinkProvider';
import Button, { ButtonSize } from './ui/Button';

interface AddAccountButtonProps {
  onAccountsAdded?: (accounts: ConnectedAccount[]) => void;
  variant?: 'primary' | 'secondary' | 'compact';
  size?: ButtonSize;
  className?: string;
}

export default function AddAccountButton({
  onAccountsAdded,
  variant = 'primary',
  size,
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

  const resolvedSize: ButtonSize = size ?? (variant === 'compact' ? 'sm' : 'lg');

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={variant}
        size={resolvedSize}
        onClick={handleClick}
        disabled={isBusy}
        loading={isBusy}
        className={className}
        icon={
          !isBusy ? (
            <>
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <Landmark className="w-4 h-4 opacity-80" />
            </>
          ) : undefined
        }
      >
        {isBusy ? 'Loading Plaid...' : 'Add Account'}
      </Button>

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-md">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}