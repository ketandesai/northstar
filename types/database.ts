import { ConnectedAccount } from './account';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plaid_items: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          access_token: string;
          institution_id: string;
          institution_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          item_id: string;
          access_token: string;
          institution_id: string;
          institution_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          access_token?: string;
          institution_id?: string;
          institution_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plaid_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          item_id: string | null;
          name: string;
          official_name: string | null;
          mask: string | null;
          type: string;
          subtype: string | null;
          category: string | null;
          available_balance: number | null;
          current_balance: number | null;
          iso_currency_code: string;
          institution_id: string | null;
          institution_name: string | null;
          connected_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id?: string;
          item_id?: string | null;
          name: string;
          official_name?: string | null;
          mask?: string | null;
          type: string;
          subtype?: string | null;
          category?: string | null;
          available_balance?: number | null;
          current_balance?: number | null;
          iso_currency_code?: string;
          institution_id?: string | null;
          institution_name?: string | null;
          connected_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string | null;
          name?: string;
          official_name?: string | null;
          mask?: string | null;
          type?: string;
          subtype?: string | null;
          category?: string | null;
          available_balance?: number | null;
          current_balance?: number | null;
          iso_currency_code?: string;
          institution_id?: string | null;
          institution_name?: string | null;
          connected_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'accounts_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'plaid_items';
            referencedColumns: ['item_id'];
          },
          {
            foreignKeyName: 'accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      balance_history: {
        Row: {
          id: number;
          account_id: string;
          user_id: string;
          snapshot_date: string;
          available_balance: number | null;
          current_balance: number | null;
          iso_currency_code: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          account_id: string;
          user_id?: string;
          snapshot_date: string;
          available_balance?: number | null;
          current_balance?: number | null;
          iso_currency_code?: string;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          account_id?: string;
          user_id?: string;
          snapshot_date?: string;
          available_balance?: number | null;
          current_balance?: number | null;
          iso_currency_code?: string;
          source?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'balance_history_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'balance_history_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type AccountRow = Omit<
  Database['public']['Tables']['accounts']['Row'],
  'available_balance' | 'current_balance'
> & {
  // pg returns NUMERIC columns as strings; widening the AccountRow type
  // lets mapAccountRowToConnectedAccount accept both styles.
  available_balance: number | string | null;
  current_balance: number | string | null;
};
export type AccountInsert = Database['public']['Tables']['accounts']['Insert'];

export type BalanceHistoryRow = Omit<
  Database['public']['Tables']['balance_history']['Row'],
  'available_balance' | 'current_balance'
> & {
  // pg returns NUMERIC columns as strings; accept both for consistency with AccountRow.
  available_balance: number | string | null;
  current_balance: number | string | null;
};
export type BalanceHistoryInsert = Database['public']['Tables']['balance_history']['Insert'];

export interface NetWorthPoint {
  /** ISO snapshot date (yyyy-mm-dd). */
  date: string;
  /** Net worth for that day: positive balances credit/loan subtracted. */
  netWorth: number;
}

export const DEFAULT_GUEST_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Transforms a Postgres accounts table row into a frontend ConnectedAccount model.
 */
export function mapAccountRowToConnectedAccount(row: AccountRow): ConnectedAccount {
  return {
    id: row.id,
    name: row.name,
    officialName: row.official_name || row.name,
    mask: row.mask || '••••',
    type: row.type,
    subtype: row.subtype,
    category: (row.category as ConnectedAccount['category']) ?? null,
    balances: {
      available: row.available_balance !== null ? Number(row.available_balance) : null,
      current: row.current_balance !== null ? Number(row.current_balance) : null,
      isoCurrencyCode: row.iso_currency_code || 'USD',
    },
    institution: {
      id: row.institution_id || 'unknown',
      name: row.institution_name || 'Connected Bank',
    },
    connectedAt: row.connected_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Transforms a ConnectedAccount object into a Postgres accounts insert payload.
 */
export function mapConnectedAccountToInsert(
  account: ConnectedAccount,
  userId: string = DEFAULT_GUEST_USER_ID,
  itemId?: string
): AccountInsert {
  return {
    id: account.id,
    user_id: userId,
    item_id: itemId || null,
    name: account.name,
    official_name: account.officialName || null,
    mask: account.mask || null,
    type: account.type,
    subtype: account.subtype || null,
    category: account.category ?? null,
    available_balance: account.balances.available,
    current_balance: account.balances.current,
    iso_currency_code: account.balances.isoCurrencyCode || 'USD',
    institution_id: account.institution.id || null,
    institution_name: account.institution.name || null,
    connected_at: account.connectedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
