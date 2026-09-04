'use client';

import React from 'react';
import { ConnectedAccount } from '@/types/account';
import { Landmark, CreditCard, PiggyBank, Wallet, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import AddAccountButton from './AddAccountButton';

interface ConnectedAccountsListProps {
  accounts: ConnectedAccount[];
  onRemoveAccount?: (accountId: string) => void;
  onAccountsAdded?: (accounts: ConnectedAccount[]) => void;
  isLoading?: boolean;
}

export default function ConnectedAccountsList({
  accounts,
  onRemoveAccount,
  onAccountsAdded,
  isLoading = false,
}: ConnectedAccountsListProps) {
  const getAccountIcon = (type: string, subtype: string | null) => {
    const sub = subtype?.toLowerCase();
    if (sub === 'credit card' || type === 'credit') {
      return <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    }
    if (sub === 'savings' || sub === 'money market') {
      return <PiggyBank className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
    if (type === 'loan') {
      return <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    }
    return <Landmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
  };

  const formatCurrency = (amount: number | null, currency: string = 'USD') => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  if (isLoading && accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Loading your connected accounts...</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Syncing with PostgreSQL database</p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900/40">
          <Landmark className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          No bank accounts connected yet
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-6">
          Connect your bank account securely using Plaid to view balances, track transactions, and manage your financial metrics.
        </p>
        <AddAccountButton onAccountsAdded={onAccountsAdded} variant="primary" />
      </div>
    );
  }

  // Calculate total balance
  const totalBalance = accounts.reduce((sum, acc) => {
    const bal = acc.balances.current ?? acc.balances.available ?? 0;
    return acc.type === 'credit' || acc.type === 'loan' ? sum - bal : sum + bal;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total Net Balance
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatCurrency(totalBalance)}
            </span>
          </div>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 block">
            Across {accounts.length} linked {accounts.length === 1 ? 'account' : 'accounts'}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Connected Institutions
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {new Set(accounts.map((a) => a.institution.name)).size}
            </span>
          </div>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 block">
            Secured via Plaid Link
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Connection Status
            </span>
            <div className="mt-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Active & Syncing</span>
            </div>
          </div>
          <div className="pt-2">
            <AddAccountButton onAccountsAdded={onAccountsAdded} variant="compact" />
          </div>
        </div>
      </div>

      {/* Account Cards */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
            Linked Accounts
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
          </span>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {accounts.map((account) => {
            const currentBal = account.balances.current ?? account.balances.available;
            const availableBal = account.balances.available;

            return (
              <div
                key={account.id}
                className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0">
                    {getAccountIcon(account.type, account.subtype)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-zinc-900 dark:text-zinc-100 text-base">
                        {account.name}
                      </h4>
                      <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {account.mask ? `•••• ${account.mask}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{account.institution.name}</span>
                      <span>•</span>
                      <span className="capitalize">{account.subtype || account.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pl-14 sm:pl-0">
                  <div className="text-right">
                    <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(currentBal, account.balances.isoCurrencyCode)}
                    </div>
                    {availableBal !== null && availableBal !== currentBal && (
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">
                        Available: {formatCurrency(availableBal, account.balances.isoCurrencyCode)}
                      </div>
                    )}
                  </div>

                  {onRemoveAccount && (
                    <button
                      type="button"
                      onClick={() => onRemoveAccount(account.id)}
                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Disconnect Account"
                      aria-label="Disconnect Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
