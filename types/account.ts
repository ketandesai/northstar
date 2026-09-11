export interface AccountBalance {
  available: number | null;
  current: number | null;
  isoCurrencyCode: string;
}

export interface BankInstitution {
  id: string;
  name: string;
}

export interface ConnectedAccount {
  id: string;
  name: string;
  officialName: string;
  mask: string;
  type: string;
  subtype: string | null;
  balances: AccountBalance;
  institution: BankInstitution;
  connectedAt?: string;
  updatedAt?: string;
}

/** The account type used for manually entered non-bank assets. */
export const MANUAL_ASSET_TYPE = 'asset';

/** Supported manual asset categories, stored in the account `subtype`. */
export const ASSET_CATEGORIES = [
  'home',
  'car',
  'private_equity',
  'investment',
  'other',
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  home: 'Home',
  car: 'Car',
  private_equity: 'Private Equity',
  investment: 'Investment',
  other: 'Other',
};

export function isManualAsset(account: ConnectedAccount): boolean {
  return account.type === MANUAL_ASSET_TYPE;
}

export function getAssetCategoryLabel(
  subtype: string | null,
  fallback = 'Other'
): string {
  if (!subtype) return fallback;
  return ASSET_CATEGORY_LABELS[subtype as AssetCategory] || fallback;
}

export interface ManualAssetInput {
  name: string;
  subtype: AssetCategory;
  value: number;
  isoCurrencyCode?: string;
  officialName?: string;
}

export interface HomeValuationResult {
  address: string;
  formattedAddress?: string;
  estimatedValue: number;
  priceRangeLow?: number | null;
  priceRangeHigh?: number | null;
  currency: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFootage?: number | null;
  propertyType?: string | null;
  valuationDate: string;
  provider: 'rentcast' | 'mock';
  isSimulated: boolean;
}

/**
 * Builds a ConnectedAccount that represents a manually entered asset
 * (home, car, private equity, ...). The value is stored in the current
 * balance so it flows into the net-worth aggregation automatically.
 */
export function buildManualAsset(input: ManualAssetInput): ConnectedAccount {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;

  return {
    id: `asset_${id}`,
    name: input.name,
    officialName: input.officialName || input.name,
    mask: '',
    type: MANUAL_ASSET_TYPE,
    subtype: input.subtype,
    balances: {
      available: null,
      current: input.value,
      isoCurrencyCode: input.isoCurrencyCode || 'USD',
    },
    institution: {
      id: 'manual_asset',
      name: ASSET_CATEGORY_LABELS[input.subtype],
    },
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

