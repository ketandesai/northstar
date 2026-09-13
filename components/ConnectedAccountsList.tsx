'use client';

import React, { useState } from 'react';
import { Plus, Package, RefreshCw } from 'lucide-react';
import { ConnectedAccount, isManualAsset } from '@/types/account';
import { getAccountCategory } from '@/lib/account-allocation';
import AddAccountButton from './AddAccountButton';
import AddAssetModal from './AddAssetModal';
import Button from './ui/Button';
import AccountCategoryCard from './accounts/AccountCategoryCard';
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
  isLoading?: boolean;
}

export default function ConnectedAccountsList({
  accounts,
  onRemoveAccount,
  onAccountsAdded,
  onUpdateAccount,
  onRefreshBalances,
  isRefreshing = false,
  isLoading = false,
}: ConnectedAccountsListProps) {
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ConnectedAccount | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ConnectedAccount | null>(null);

  const linkedAccounts = accounts.filter((a) => !isManualAsset(a));
  const manualAssets = accounts.filter(isManualAsset);

  const cashAccounts = linkedAccounts.filter((a) => getAccountCategory(a) === 'cash');
  const investmentAccounts = linkedAccounts.filter((a) => getAccountCategory(a) === 'investment');
  const retirementAccounts = linkedAccounts.filter((a) => getAccountCategory(a) === 'retirement');
  const creditAccounts = linkedAccounts.filter((a) => {
    const category = getAccountCategory(a);
    return category !== 'cash' && category !== 'investment' && category !== 'retirement';
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
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

      <AccountCategoryCard
        title="Cash"
        accounts={cashAccounts}
        emptyMessage={'No cash accounts connected yet. Use \u201CAdd Account\u201D to link a checking or savings account.'}
        onEditAccount={onUpdateAccount ? openEditAccount : undefined}
        onRemoveAccount={onRemoveAccount}
      />

      <AccountCategoryCard
        title="Investments"
        accounts={investmentAccounts}
        emptyMessage={'No investment accounts connected yet. Use \u201CAdd Account\u201D to link one via Plaid.'}
        onEditAccount={onUpdateAccount ? openEditAccount : undefined}
        onRemoveAccount={onRemoveAccount}
      />

      <AccountCategoryCard
        title="Retirement"
        accounts={retirementAccounts}
        emptyMessage={'No retirement accounts connected yet. Use \u201CAdd Account\u201D to link one via Plaid.'}
        onEditAccount={onUpdateAccount ? openEditAccount : undefined}
        onRemoveAccount={onRemoveAccount}
      />

      <AccountCategoryCard
        title="Credit"
        accounts={creditAccounts}
        emptyMessage="No credit cards or loans connected."
        onEditAccount={onUpdateAccount ? openEditAccount : undefined}
        onRemoveAccount={onRemoveAccount}
      />

      <AccountCategoryCard
        title="Other Assets"
        accounts={manualAssets}
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
        onEditAccount={onUpdateAccount ? openEditAccount : undefined}
        onRemoveAccount={onRemoveAccount}
      />

      {assetModal}
      {accountEditModal}
    </div>
  );
}