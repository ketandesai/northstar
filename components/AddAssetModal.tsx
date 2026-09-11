'use client';

import React, { useState } from 'react';
import { AlertCircle, X, Search, Loader2, Sparkles, Home as HomeIcon } from 'lucide-react';
import Button from './ui/Button';
import {
  ASSET_CATEGORIES,
  AssetCategory,
  buildManualAsset,
  getAssetCategoryLabel,
  ConnectedAccount,
  HomeValuationResult,
} from '@/types/account';
import { formatCurrency } from './accounts/format';

interface AssetPatch {
  name?: string;
  officialName?: string;
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
  const [address, setAddress] = useState(
    isEditing && asset.officialName && asset.officialName !== asset.name
      ? asset.officialName
      : ''
  );
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [valuationResult, setValuationResult] = useState<HomeValuationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    if (saving || lookingUp) return;
    onOpenChange(false);
  };

  const handleLookupHomeValue = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
    }
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setLookupError('Please enter a property address to look up.');
      return;
    }

    setLookingUp(true);
    setLookupError(null);

    try {
      const res = await fetch(`/api/valuation/home?address=${encodeURIComponent(trimmedAddress)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to look up home valuation.');
      }

      if (data?.valuation) {
        const val: HomeValuationResult = data.valuation;
        setValuationResult(val);
        setValue(String(val.estimatedValue));

        // Suggest property address as name if name is empty or generic
        if (!name.trim() || name.trim().toLowerCase() === 'home' || name.trim().toLowerCase() === 'primary home') {
          setName(val.formattedAddress || trimmedAddress);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to look up home value';
      setLookupError(msg);
    } finally {
      setLookingUp(false);
    }
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
        const patch: AssetPatch = {
          name: trimmedName,
          subtype,
          currentBalance: parsedValue,
        };
        if (subtype === 'home' && address.trim() && address.trim() !== asset.officialName) {
          patch.officialName = address.trim();
        }
        await onUpdate(asset.id, patch);
      } else if (onSave) {
        const manualAsset = buildManualAsset({
          name: trimmedName,
          officialName: subtype === 'home' && address.trim() ? address.trim() : trimmedName,
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
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10">
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
            disabled={saving || lookingUp}
            icon={<X className="w-4 h-4" />}
            aria-label="Close"
          />
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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

          {subtype === 'home' && (
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="property-address"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
                >
                  <HomeIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  Property Address (for automated valuation)
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  id="property-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupHomeValue();
                    }
                  }}
                  placeholder="e.g. 123 Main St, Austin, TX 78701"
                  className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLookupHomeValue}
                  disabled={lookingUp || !address.trim()}
                  loading={lookingUp}
                  icon={lookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                >
                  Look Up
                </Button>
              </div>

              {lookupError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}

              {valuationResult && (
                <div className="p-3 rounded-lg border border-sky-200 dark:border-sky-900/50 bg-sky-50/60 dark:bg-sky-950/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      Estimated Market Value
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        valuationResult.isSimulated
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}
                    >
                      {valuationResult.isSimulated ? 'Simulated AVM' : 'RentCast AVM'}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(valuationResult.estimatedValue, valuationResult.currency)}
                  </div>
                  {(valuationResult.priceRangeLow || valuationResult.priceRangeHigh) && (
                    <div className="text-zinc-500 dark:text-zinc-400">
                      Estimated Range:{' '}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {formatCurrency(valuationResult.priceRangeLow ?? null, valuationResult.currency)} –{' '}
                        {formatCurrency(valuationResult.priceRangeHigh ?? null, valuationResult.currency)}
                      </span>
                    </div>
                  )}
                  {(valuationResult.bedrooms || valuationResult.bathrooms || valuationResult.squareFootage) && (
                    <div className="text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-2 gap-y-0.5 pt-1.5 border-t border-sky-200/60 dark:border-sky-900/40">
                      {valuationResult.bedrooms && <span>{valuationResult.bedrooms} beds</span>}
                      {valuationResult.bathrooms && <span>• {valuationResult.bathrooms} baths</span>}
                      {valuationResult.squareFootage && (
                        <span>• {valuationResult.squareFootage.toLocaleString()} sq ft</span>
                      )}
                      {valuationResult.propertyType && <span>• {valuationResult.propertyType}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saving || lookingUp}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={saving || lookingUp}
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