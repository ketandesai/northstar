'use client';

import React, { useState } from 'react';
import { ConnectedAccount, isManualAsset, getAssetCategoryLabel } from '@/types/account';
import {
  Landmark,
  CreditCard,
  PiggyBank,
  Wallet,
  Trash2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Home,
  Car,
  Briefcase,
  TrendingUp,
  Package,
  Pencil,
  Plus,
} from 'lucide-react';
import AddAccountButton from './AddAccountButton';
import AddAssetModal from './AddAssetModal';

interface ConnectedAccountsListProps {
  accounts: ConnectedAccount[];
  onRemoveAccount?: (accountId: string) => void;
  onAccountsAdded?: (accounts: ConnectedAccount[]) => void;
  onUpdateAccount?: (
    accountId: string,
    patch: {
      name?: string;
      subtype?: string;
      currentBalance?: number | null;
      isoCurrencyCode?: string;
    }
  ) => void | Promise<void>;
  onRefreshBalances?: () => void;
  isRefreshing?: boolean;
  lastRefreshedAt?: string | null;
  isLoading?: boolean;
}

export default function ConnectedAccountsList({
  accounts,
  onRemoveAccount,
  onAccountsAdded,
  onUpdateAccount,
  onRefreshBalances,
  isRefreshing = false,
  lastRefreshedAt = null,
  isLoading = false,
}: ConnectedAccountsListProps) {
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ConnectedAccount | null>(null);

  const linkedAccounts = accounts.filter((a) => !isManualAsset(a));
  const manualAssets = accounts.filter(isManualAsset);

  const getBankAccountIcon = (type: string, subtype: string | null) => {
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

  const getAssetIcon = (subtype: string | null) => {
    switch (subtype) {
      case 'home':
        return <Home className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case 'car':
        return <Car className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      case 'private_equity':
        return <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'investment':
        return <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />;
      default:
        return <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
    }
  };

  const formatCurrency = (amount: number | null, currency: string = 'USD') => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatTimestamp = (isoDate: string) => {
    const then = new Date(isoDate);
    if (Number.isNaN(then.getTime())) return '';
    return then.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const openAddAsset = () => {
    setEditingAsset(null);
    setAssetModalOpen(true);
  };

  const openEditAsset = (asset: ConnectedAccount) => {
    setEditingAsset(asset);
    setAssetModalOpen(true);
  };

  if (isLoading && accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Loading your accounts and assets...</p>
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
          No bank accounts or assets yet
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-6">
          Connect your bank accounts securely using Plaid to monitor balances and track
          transactions, or add assets like your home, car, and private equity manually.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <AddAccountButton onAccountsAdded={onAccountsAdded} variant="primary" />
          <button
            type="button"
            onClick={openAddAsset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <Package className="w-4 h-4 opacity-80" />
            <span>Add Asset</span>
          </button>
        </div>
        <AddAssetModal
          key={assetModalOpen ? `edit-${editingAsset?.id ?? 'new'}` : 'closed'}
          open={assetModalOpen}
          onOpenChange={setAssetModalOpen}
          asset={editingAsset}
          onSave={(asset) => onAccountsAdded?.([asset])}
          onUpdate={onUpdateAccount}
        />
      </div>
    );
  }

  // Calculate total net balance (assets add, credit/loan subtract)
  const totalBalance = accounts.reduce((sum, acc) => {
    const bal = acc.balances.current ?? acc.balances.available ?? 0;
    return acc.type === 'credit' || acc.type === 'loan' ? sum - bal : sum + bal;
  }, 0);

  const trackedCount = accounts.length;
  const institutionCount = new Set(linkedAccounts.map((a) => a.institution.name)).size;

  const renderAccountRow = (account: ConnectedAccount) => {
    const isAsset = isManualAsset(account);
    const currentBal = account.balances.current ?? account.balances.available;
    const availableBal = account.balances.available;

    return (
      <div
        key={account.id}
        className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-start sm:items-center gap-4">
          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0">
            {isAsset
              ? getAssetIcon(account.subtype)
              : getBankAccountIcon(account.type, account.subtype)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100 text-base">
                {account.name}
              </h4>
              {!isAsset && account.mask && (
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  •••• {account.mask}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{isAsset ? getAssetCategoryLabel(account.subtype) : account.institution.name}</span>
              <span>•</span>
              <span className="capitalize">{isAsset ? 'Asset' : account.subtype || account.type}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 pl-14 sm:pl-0">
          <div className="text-right">
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(currentBal, account.balances.isoCurrencyCode)}
            </div>
            {!isAsset && availableBal !== null && availableBal !== currentBal && (
              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                Available: {formatCurrency(availableBal, account.balances.isoCurrencyCode)}
              </div>
            )}
          </div>

          {(onUpdateAccount && isAsset) || onRemoveAccount ? (
            <div className="flex items-center gap-1">
              {isAsset && onUpdateAccount && (
                <button
                  type="button"
                  onClick={() => openEditAsset(account)}
                  className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors cursor-pointer"
                  title="Edit Asset"
                  aria-label="Edit asset"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onRemoveAccount && (
                <button
                  type="button"
                  onClick={() => onRemoveAccount(account.id)}
                  className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                  title={isAsset ? 'Remove Asset' : 'Disconnect Account'}
                  aria-label={isAsset ? 'Remove asset' : 'Disconnect Account'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

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
            Across {trackedCount} {trackedCount === 1 ? 'account & asset' : 'accounts & assets'}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Connected Institutions
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {institutionCount}
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
            {lastRefreshedAt && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block">
                Last updated {formatTimestamp(lastRefreshedAt)}
              </span>
            )}
          </div>
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={onRefreshBalances}
              disabled={isRefreshing || !onRefreshBalances}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Refresh balances"
            >
              {isRefreshing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {isRefreshing ? 'Refreshing...' : 'Refresh balances'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <AddAccountButton onAccountsAdded={onAccountsAdded} variant="compact" />
              <button
                type="button"
                onClick={openAddAsset}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border border-blue-200 dark:border-blue-800/60 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <Package className="w-3.5 h-3.5 opacity-80" />
                <span>Add Asset</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Bank Accounts */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
            Linked Accounts
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {linkedAccounts.length} {linkedAccounts.length === 1 ? 'account' : 'accounts'}
          </span>
        </div>

        {linkedAccounts.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No bank accounts connected yet. Use &ldquo;Add Account&rdquo; to link one via Plaid.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {linkedAccounts.map(renderAccountRow)}
          </div>
        )}
      </div>

      {/* Other Assets */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
            Other Assets
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {manualAssets.length} {manualAssets.length === 1 ? 'asset' : 'assets'}
          </span>
        </div>

        {manualAssets.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Track your home, car, private equity, and other assets to see your full net worth.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {manualAssets.map(renderAccountRow)}
          </div>
        )}
      </div>

      <AddAssetModal
        key={assetModalOpen ? `edit-${editingAsset?.id ?? 'new'}` : 'closed'}
        open={assetModalOpen}
        onOpenChange={setAssetModalOpen}
        asset={editingAsset}
        onSave={(asset) => onAccountsAdded?.([asset])}
        onUpdate={onUpdateAccount}
      />
    </div>
  );
}