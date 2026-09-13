import React from 'react';
import { ConnectedAccount } from '@/types/account';
import AccountRow from './AccountRow';
import AccountsSection from './AccountsSection';

interface AccountCategoryCardProps {
  title: string;
  accounts: ConnectedAccount[];
  emptyMessage: string;
  singular?: string;
  plural?: string;
  action?: React.ReactNode;
  onEditAccount?: (account: ConnectedAccount) => void;
  onRemoveAccount?: (accountId: string) => void;
}

export default function AccountCategoryCard({
  title,
  accounts,
  emptyMessage,
  singular = 'account',
  plural = 'accounts',
  action,
  onEditAccount,
  onRemoveAccount,
}: AccountCategoryCardProps) {
  return (
    <AccountsSection
      title={title}
      count={accounts.length}
      singular={singular}
      plural={plural}
      emptyMessage={emptyMessage}
      action={action}
    >
      {accounts.map((account) => (
        <AccountRow
          key={account.id}
          account={account}
          onEditAccount={onEditAccount}
          onRemoveAccount={onRemoveAccount}
        />
      ))}
    </AccountsSection>
  );
}