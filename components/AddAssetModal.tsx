'use client';

import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import Button from './ui/Button';
import {
  ASSET_CATEGORIES,
  AssetCategory,
  buildManualAsset,
  getAssetCategoryLabel,
  ConnectedAccount,
} from '@/types/account';

interface AssetPatch {
  name?: string;
  subtype?: string;
  currentBalance?: number | null;
  isoCurrencyCode?: string;
}

interface AddAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the modal edits this asset instead of creating a new one. */
  asset?: ConnectedAccount | null;
  onSave?: (asset: ConnectedAccount) => void | Promise<void>;
  onUpdate?: (accountId: string, patch: AssetPatch) => void | Promise<void>;
}

export default function AddAssetModal({
  open,
  onOpenChange,
  asset = null,
  onSave,
  onUpdate,
}: AddAssetModalProps) {
  const isEditing = asset !== null && asset !== undefined;
  const [name, setName] = useState(isEditing ? asset.name : '');
  const [subtype, setSubtype] = useState<AssetCategory>(
    isEditing && ASSET_CATEGORIES.includes(asset.subtype as AssetCategory)
      ? (asset.subtype as AssetCategory)
      : 'home'
  );
  const [value, setValue] = useState(
    isEditing && asset.balances.current !== null ? String(asset.balances.current) : ''
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    if (saving) return;
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter a name for this asset.');
      return;
    }
    const parsedValue = Number(value);
    if (value === '' || Number.isNaN(parsedValue) || parsedValue < 0) {
      setErrorMessage('Please enter a valid current value.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && onUpdate) {
        await onUpdate(asset.id, {
          name: trimmedName,
          subtype,
          currentBalance: parsedValue,
        });
      } else if (onSave) {
        const manualAsset = buildManualAsset({
          name: trimmedName,
          subtype,
          value: parsedValue,
        });
        await onSave(manualAsset);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save asset';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit asset' : 'Add asset'}
    >
      <div
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              {isEditing ? 'Edit Asset' : 'Add an Asset'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Track assets like your home, car, and private equity.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={saving}
            icon={<X className="w-4 h-4" />}
            aria-label="Close"
          />
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="asset-name" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              Asset Name
            </label>
            <input
              id="asset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Primary Residence, Tesla Model 3"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="asset-type" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              Category
            </label>
            <select
              id="asset-type"
              value={subtype}
              onChange={(e) => setSubtype(e.target.value as AssetCategory)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            >
              {ASSET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {getAssetCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="asset-value" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              Current Value
            </label>
            <input
              id="asset-value"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={saving}
              loading={saving}
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Asset'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}