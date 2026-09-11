'use client';

import React, { useState } from 'react';
import { Plus, Package, RefreshCw } from 'lucide-react';
import { ConnectedAccount, isManualAsset } from '@/types/account';
import AddAccountButton from './AddAccountButton';
import AddAssetModal from './AddAssetModal';
import Button from './ui/Button';
import AccountRow from './accounts/AccountRow';
import AccountsSection from './accounts/AccountsSection';
import MetricsBanner from './accounts/MetricsBanner';
import LoadingState from './accounts/LoadingState';
import EmptyState from './accounts/EmptyState';
import EditAccountModal from './accounts/EditAccountModal';

interface ConnectedAccountsListProps {
  accounts: ConnectedAccount[];
  onRemoveAccount?: (accountId: string) => void;
  onAccountsAdded?: (accounts: ConnectedAccount[]) => void;
  onUpdateAccount?: (
    accountId: string,
    patch: {
      name?: string;
      type?: string;
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
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ConnectedAccount | null>(null);

  const linkedAccounts = accounts.filter((a) => !isManualAsset(a));
  const manualAssets = accounts.filter(isManualAsset);

  const openAddAsset = () => {
    setEditingAsset(null);
    setAssetModalOpen(true);
  };

  const openEditAccount = (account: ConnectedAccount) => {
    if (isManualAsset(account)) {
      setEditingAsset(account);
      setAssetModalOpen(true);
      return;
    }
    setEditingAccount(account);
    setAccountModalOpen(true);
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

  const accountEditModal =
    editingAccount && onUpdateAccount ? (
      <EditAccountModal
        key={`edit-${editingAccount.id}`}
        open={accountModalOpen}
        onOpenChange={setAccountModalOpen}
        account={editingAccount}
        onUpdate={onUpdateAccount}
      />
    ) : null;

  if (isLoading && accounts.length === 0) {
    return <LoadingState />;
  }

  if (accounts.length === 0) {
    return (
      <>
        <EmptyState onAccountsAdded={onAccountsAdded} onAddAsset={openAddAsset} />
        {assetModal}
        {accountEditModal}
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
      onEditAccount={onUpdateAccount ? openEditAccount : undefined}
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
      />

      <AccountsSection
        title="Linked Accounts"
        count={linkedAccounts.length}
        singular="account"
        plural="accounts"
        emptyMessage={'No bank accounts connected yet. Use \u201CAdd Account\u201D to link one via Plaid.'}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="compact"
              size="sm"
              onClick={onRefreshBalances}
              disabled={isRefreshing || !onRefreshBalances}
              loading={isRefreshing}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              aria-label="Refresh balances"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh balances'}
            </Button>
            <AddAccountButton
              onAccountsAdded={onAccountsAdded}
              variant="compact"
              size="sm"
            />
          </div>
        }
      >
        {linkedAccounts.map(renderAccountRow)}
      </AccountsSection>

      <AccountsSection
        title="Other Assets"
        count={manualAssets.length}
        singular="asset"
        plural="assets"
        emptyMessage="Track your home, car, private equity, and other assets to see your full net worth."
        action={
          <Button
            variant="compact"
            size="sm"
            onClick={openAddAsset}
            icon={
              <>
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <Package className="w-3.5 h-3.5 opacity-80" />
              </>
            }
          >
            Add Asset
          </Button>
        }
      >
        {manualAssets.map(renderAccountRow)}
      </AccountsSection>

      {assetModal}
      {accountEditModal}
    </div>
  );
}