'use client';

import React, { useState } from 'react';
import { ConnectedAccount, isManualAsset } from '@/types/account';
import AddAssetModal from './AddAssetModal';
import AccountRow from './accounts/AccountRow';
import AccountsSection from './accounts/AccountsSection';
import MetricsBanner from './accounts/MetricsBanner';
import LoadingState from './accounts/LoadingState';
import EmptyState from './accounts/EmptyState';

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

  const openAddAsset = () => {
    setEditingAsset(null);
    setAssetModalOpen(true);
  };

  const openEditAsset = (asset: ConnectedAccount) => {
    setEditingAsset(asset);
    setAssetModalOpen(true);
  };

  const assetModal = (
    <AddAssetModal
      key={assetModalOpen ? `edit-${editingAsset?.id ?? 'new'}` : 'closed'}
      open={assetModalOpen}
      onOpenChange={setAssetModalOpen}
      asset={editingAsset}
      onSave={(asset) => onAccountsAdded?.([asset])}
      onUpdate={onUpdateAccount}
    />
  );

  if (isLoading && accounts.length === 0) {
    return <LoadingState />;
  }

  if (accounts.length === 0) {
    return (
      <>
        <EmptyState onAccountsAdded={onAccountsAdded} onAddAsset={openAddAsset} />
        {assetModal}
      </>
    );
  }

  // Calculate total net balance (assets add, credit/loan subtract)
  const totalBalance = accounts.reduce((sum, acc) => {
    const bal = acc.balances.current ?? acc.balances.available ?? 0;
    return acc.type === 'credit' || acc.type === 'loan' ? sum - bal : sum + bal;
  }, 0);

  const trackedCount = accounts.length;
  const institutionCount = new Set(linkedAccounts.map((a) => a.institution.name)).size;

  const renderAccountRow = (account: ConnectedAccount) => (
    <AccountRow
      key={account.id}
      account={account}
      onEditAsset={onUpdateAccount ? openEditAsset : undefined}
      onRemoveAccount={onRemoveAccount}
    />
  );

  return (
    <div className="space-y-6">
      <MetricsBanner
        totalBalance={totalBalance}
        trackedCount={trackedCount}
        institutionCount={institutionCount}
        lastRefreshedAt={lastRefreshedAt}
        isRefreshing={isRefreshing}
        onRefreshBalances={onRefreshBalances}
        onAccountsAdded={onAccountsAdded}
        onAddAsset={openAddAsset}
      />

      <AccountsSection
        title="Linked Accounts"
        count={linkedAccounts.length}
        singular="account"
        plural="accounts"
        emptyMessage={'No bank accounts connected yet. Use \u201CAdd Account\u201D to link one via Plaid.'}
      >
        {linkedAccounts.map(renderAccountRow)}
      </AccountsSection>

      <AccountsSection
        title="Other Assets"
        count={manualAssets.length}
        singular="asset"
        plural="assets"
        emptyMessage="Track your home, car, private equity, and other assets to see your full net worth."
      >
        {manualAssets.map(renderAccountRow)}
      </AccountsSection>

      {assetModal}
    </div>
  );
}