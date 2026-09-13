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
  /** User-editable card grouping. Null falls back to derivation from type/subtype. */
  category?: AccountCategory | null;
  balances: AccountBalance;
  institution: BankInstitution;
  connectedAt?: string;
  updatedAt?: string;
}

/**
 * The grouping an account is bucketed into (drives the dashboard cards and the
 * asset allocation chart). When `category` is null, it is derived from type/subtype.
 */
export type AccountCategory =
  | 'retirement'
  | 'cash'
  | 'property'
  | 'investment'
  | 'credit'
  | 'other';

export const CATEGORY_LABELS: Record<AccountCategory, string> = {
  retirement: 'Retirement',
  cash: 'Cash',
  property: 'Property',
  investment: 'Investments',
  credit: 'Credit',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<AccountCategory, string> = {
  retirement: '#2563eb',
  cash: '#10b981',
  property: '#0ea5e9',
  investment: '#8b5cf6',
  credit: '#ef4444',
  other: '#71717a',
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
);

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
  category?: AccountCategory;
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
    officialName: input.name,
    mask: '',
    type: MANUAL_ASSET_TYPE,
    subtype: input.subtype,
    category: input.category ?? null,
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
