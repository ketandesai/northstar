import React, { useState } from 'react';
import { ConnectedAccount, isManualAsset, getAssetCategoryLabel } from '@/types/account';
import { formatCurrency } from './format';
import {
  Pencil,
  Trash2,
  Landmark,
  CreditCard,
  PiggyBank,
  Wallet,
  Home,
  Car,
  Briefcase,
  TrendingUp,
  Package,
  RefreshCw,
} from 'lucide-react';
import Button from '../ui/Button';

interface AccountRowProps {
  account: ConnectedAccount;
  onEditAsset?: (account: ConnectedAccount) => void;
  onRemoveAccount?: (accountId: string) => void;
  onRefreshHomeValue?: (accountId: string) => void | Promise<void>;
}

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

export default function AccountRow({
  account,
  onEditAsset,
  onRemoveAccount,
  onRefreshHomeValue,
}: AccountRowProps) {
  const isAsset = isManualAsset(account);
  const currentBal = account.balances.current ?? account.balances.available;
  const availableBal = account.balances.available;
  const [refreshingHome, setRefreshingHome] = useState(false);

  const handleRefreshHome = async () => {
    if (!onRefreshHomeValue || refreshingHome) return;
    setRefreshingHome(true);
    try {
      await onRefreshHomeValue(account.id);
    } finally {
      setRefreshingHome(false);
    }
  };

  return (
    <div className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
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
          {isAsset && account.subtype === 'home' && account.officialName && account.officialName !== account.name && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-xs sm:max-w-md">
              {account.officialName}
            </p>
          )}
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

        {((onEditAsset && isAsset) || onRemoveAccount || (isAsset && account.subtype === 'home' && onRefreshHomeValue)) && (
          <div className="flex items-center gap-1">
            {isAsset && account.subtype === 'home' && onRefreshHomeValue && (
              <Button
                variant="ghost"
                hoverAccent="blue"
                onClick={handleRefreshHome}
                disabled={refreshingHome}
                loading={refreshingHome}
                icon={<RefreshCw className={`w-4 h-4 ${refreshingHome ? 'animate-spin' : ''}`} />}
                title="Refresh Home Valuation"
                aria-label="Refresh home valuation"
              />
            )}
            {isAsset && onEditAsset && (
              <Button
                variant="ghost"
                hoverAccent="blue"
                onClick={() => onEditAsset(account)}
                icon={<Pencil className="w-4 h-4" />}
                title="Edit Asset"
                aria-label="Edit asset"
              />
            )}
            {onRemoveAccount && (
              <Button
                variant="ghost"
                hoverAccent="rose"
                onClick={() => onRemoveAccount(account.id)}
                icon={<Trash2 className="w-4 h-4" />}
                title={isAsset ? 'Remove Asset' : 'Disconnect Account'}
                aria-label={isAsset ? 'Remove asset' : 'Disconnect Account'}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}