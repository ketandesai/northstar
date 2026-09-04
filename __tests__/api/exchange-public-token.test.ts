import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as plaidLib from '@/lib/plaid';
import { POST } from '@/app/api/plaid/exchange-public-token/route';
import * as dbLib from '@/lib/db';
import { AxiosResponse } from 'axios';
import { ItemPublicTokenExchangeResponse, AccountsGetResponse, AccountType, AccountSubtype } from 'plaid';

describe('/api/plaid/exchange-public-token', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 if public_token is missing', async () => {
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(true);

    const req = new Request('http://localhost:3000/api/plaid/exchange-public-token', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe('MISSING_PUBLIC_TOKEN');
  });

  it('successfully exchanges token, retrieves accounts, and persists to PostgreSQL', async () => {
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(true);

    vi.spyOn(plaidLib.plaidClient, 'itemPublicTokenExchange').mockResolvedValue({
      data: {
        access_token: 'access-sandbox-999',
        item_id: 'item_123',
        request_id: 'req_456',
      },
    } as unknown as AxiosResponse<ItemPublicTokenExchangeResponse>);

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
          {
            account_id: 'acc_02',
            name: 'Plaid Savings',
            official_name: 'Plaid Silver Savings',
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
        request_id: 'req_789',
      },
    } as unknown as AxiosResponse<AccountsGetResponse>);

    const queryMock = vi.fn().mockResolvedValue({ rowCount: 1, rows: [] });
    const client = {
      query: queryMock,
      release: vi.fn(),
    };
    const clientConnect = vi.spyOn(dbLib, 'db', 'get').mockReturnValue({
      connect: vi.fn().mockResolvedValue(client),
    } as unknown as typeof dbLib.db);

    const req = new Request('http://localhost:3000/api/plaid/exchange-public-token', {
      method: 'POST',
      body: JSON.stringify({
        public_token: 'public-sandbox-abc-123',
        institution: { id: 'ins_chase', name: 'Chase Bank' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.item_id).toBe('item_123');
    expect(data.accounts).toHaveLength(2);
    expect(data.accounts[0]).toMatchObject({
      id: 'acc_01',
      name: 'Plaid Checking',
      mask: '0000',
      type: 'depository',
      subtype: 'checking',
      balances: {
        available: 100,
        current: 110,
        isoCurrencyCode: 'USD',
      },
      institution: {
        id: 'ins_chase',
        name: 'Chase Bank',
      },
    });

    // Verify PostgreSQL persistence calls
    expect(clientConnect).toHaveBeenCalled();

    const sqlCalls = queryMock.mock.calls.map((call) => call[0] as string);

    // Profile seed
    expect(sqlCalls.some((sql) => sql.includes('INSERT INTO profiles'))).toBe(true);

    // Plaid item upsert
    const itemCall = queryMock.mock.calls.find((call) =>
      (call[0] as string).includes('INSERT INTO plaid_items')
    );
    expect(itemCall).toBeDefined();
    expect(itemCall?.[1]).toEqual(
      expect.arrayContaining([
        'item_123',
        'access-sandbox-999',
        'ins_chase',
        'Chase Bank',
      ])
    );
    expect(queryMock).toHaveBeenCalledWith('BEGIN');

    // Account upserts for both accounts
    expect(
      sqlCalls.some((sql) => sql.includes('INSERT INTO accounts'))
    ).toBe(true);

    const accountCalls = queryMock.mock.calls.filter((call) =>
      (call[0] as string).includes('INSERT INTO accounts')
    );
    expect(accountCalls).toHaveLength(2);
    expect(accountCalls[0]?.[1]).toEqual(
      expect.arrayContaining(['acc_01', 'item_123', 'Plaid Checking'])
    );
    expect(accountCalls[1]?.[1]).toEqual(
      expect.arrayContaining(['acc_02', 'item_123', 'Plaid Savings'])
    );

    // Transaction committed and client released
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('handles Plaid exchange failure gracefully', async () => {
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(true);

    vi.spyOn(plaidLib.plaidClient, 'itemPublicTokenExchange').mockRejectedValue({
      response: {
        data: {
          error_message: 'Public token has expired',
          error_code: 'INVALID_PUBLIC_TOKEN',
        },
      },
    });

    const req = new Request('http://localhost:3000/api/plaid/exchange-public-token', {
      method: 'POST',
      body: JSON.stringify({
        public_token: 'expired_token',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe('Public token has expired');
    expect(data.code).toBe('INVALID_PUBLIC_TOKEN');
  });
});
