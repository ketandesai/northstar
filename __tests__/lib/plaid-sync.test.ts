import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as plaidLib from '@/lib/plaid';
import * as dbLib from '@/lib/db';
import { refreshBalances } from '@/lib/plaid-sync';
import { AxiosResponse } from 'axios';
import { AccountsGetResponse, AccountType, AccountSubtype } from 'plaid';

describe('refreshBalances', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('refreshes balances and records a daily snapshot per account', async () => {
    vi.spyOn(dbLib, 'db', 'get').mockReturnValue({
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            item_id: 'item_123',
            user_id: '00000000-0000-0000-0000-000000000000',
            access_token: 'access-sandbox-999',
          },
        ],
      }),
    } as unknown as typeof dbLib.db);

    vi.spyOn(plaidLib.plaidClient, 'accountsGet').mockResolvedValue({
      data: {
        item: {
          institution_id: 'ins_chase',
          item_id: 'item_123',
          webhook: null,
          error: null,
          available_products: [],
          billed_products: [],
          consent_expiration_time: null,
          update_type: 'background',
        },
        accounts: [
          {
            account_id: 'acc_01',
            name: 'Plaid Checking',
            official_name: 'Plaid Gold Checking',
            mask: '0000',
            type: AccountType.Depository,
            subtype: AccountSubtype.Checking,
            balances: {
              available: 100,
              current: 110,
              iso_currency_code: 'USD',
              limit: null,
              unofficial_currency_code: null,
            },
          },
        ],
        request_id: 'req_789',
      },
    } as unknown as AxiosResponse<AccountsGetResponse>);

    const summary = await refreshBalances();

    expect(summary.itemsRefreshed).toBe(1);
    expect(summary.accountsUpdated).toBe(1);
    expect(summary.snapshotsWritten).toBe(1);

    const db = dbLib.db as unknown as { query: ReturnType<typeof vi.fn> };
    const calls = db.query.mock.calls;

    // First call: fetch plaid_items
    expect(calls[0][0]).toContain('SELECT item_id, user_id, access_token FROM plaid_items');

    // Account balance update
    const updateCall = calls.find((c) => (c[0] as string).startsWith('UPDATE accounts'));
    expect(updateCall).toBeDefined();
    expect(updateCall?.[1]).toEqual(['acc_01', 100, 110, 'USD', expect.any(String)]);

    // Balance history snapshot (idempotent daily upsert)
    const historyCall = calls.find((c) => (c[0] as string).includes('INSERT INTO balance_history'));
    expect(historyCall).toBeDefined();
    const today = new Date().toISOString().slice(0, 10);
    expect(historyCall?.[1][0]).toBe('acc_01');
    expect(historyCall?.[1][2]).toBe(today);
    expect(historyCall?.[1][3]).toBe(100);
    expect(historyCall?.[1][4]).toBe(110);
    expect((historyCall?.[0] as string)).toContain('ON CONFLICT (account_id, snapshot_date)');
  });

  it('skips items without an access token', async () => {
    vi.spyOn(dbLib, 'db', 'get').mockReturnValue({
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            item_id: 'item_none',
            user_id: '00000000-0000-0000-0000-000000000000',
            access_token: null,
          },
        ],
      }),
    } as unknown as typeof dbLib.db);

    const accountsGet = vi.spyOn(plaidLib.plaidClient, 'accountsGet');

    const summary = await refreshBalances();

    expect(accountsGet).not.toHaveBeenCalled();
    expect(summary.itemsRefreshed).toBe(0);
    expect(summary.accountsUpdated).toBe(0);
    expect(summary.snapshotsWritten).toBe(0);
  });

  it('continues past a failing item', async () => {
    vi.spyOn(dbLib, 'db', 'get').mockReturnValue({
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            item_id: 'item_bad',
            user_id: '00000000-0000-0000-0000-000000000000',
            access_token: 'access-bad',
          },
          {
            item_id: 'item_good',
            user_id: '00000000-0000-0000-0000-000000000000',
            access_token: 'access-good',
          },
        ],
      }),
    } as unknown as typeof dbLib.db);

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.spyOn(plaidLib.plaidClient, 'accountsGet')
      .mockRejectedValueOnce({ response: { data: { error_message: 'Item error' } } })
      .mockResolvedValueOnce({
        data: {
          item: {
            institution_id: 'ins_chase',
            item_id: 'item_good',
            webhook: null,
            error: null,
            available_products: [],
            billed_products: [],
            consent_expiration_time: null,
            update_type: 'background',
          },
          accounts: [
            {
              account_id: 'acc_02',
              name: 'Plaid Savings',
              official_name: null,
              mask: '1111',
              type: AccountType.Depository,
              subtype: AccountSubtype.Savings,
              balances: {
                available: 5000,
                current: 5000,
                iso_currency_code: 'USD',
                limit: null,
                unofficial_currency_code: null,
              },
            },
          ],
          request_id: 'req_111',
        },
      } as unknown as AxiosResponse<AccountsGetResponse>);

    const summary = await refreshBalances();

    expect(summary.itemsRefreshed).toBe(1);
    expect(summary.accountsUpdated).toBe(1);
    expect(errSpy).toHaveBeenCalled();
  });
});
