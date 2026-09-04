import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/accounts/route';
import { DELETE } from '@/app/api/accounts/[id]/route';
import * as dbLib from '@/lib/db';

describe('/api/accounts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockDbAccounts = [
    {
      id: 'acc_01',
      user_id: '00000000-0000-0000-0000-000000000000',
      item_id: 'item_01',
      name: 'Checking',
      official_name: 'Total Checking',
      mask: '1234',
      type: 'depository',
      subtype: 'checking',
      available_balance: '100.50',
      current_balance: '150.75',
      iso_currency_code: 'USD',
      institution_id: 'ins_chase',
      institution_name: 'Chase Bank',
      connected_at: '2026-09-04T12:00:00.000Z',
      updated_at: '2026-09-04T12:00:00.000Z',
    },
  ];

  it('GET returns formatted accounts from PostgreSQL', async () => {
    vi.spyOn(dbLib, 'query').mockResolvedValue(mockDbAccounts as never[]);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.accounts).toHaveLength(1);
    expect(data.accounts[0]).toMatchObject({
      id: 'acc_01',
      name: 'Checking',
      officialName: 'Total Checking',
      mask: '1234',
      type: 'depository',
      subtype: 'checking',
      balances: {
        available: 100.5,
        current: 150.75,
        isoCurrencyCode: 'USD',
      },
      institution: {
        id: 'ins_chase',
        name: 'Chase Bank',
      },
    });
  });

  it('POST inserts accounts into PostgreSQL', async () => {
    const queryMock = vi
      .spyOn(dbLib, 'query')
      .mockResolvedValueOnce([] as never[])
      .mockResolvedValueOnce(mockDbAccounts as never[]);

    const req = new Request('http://localhost:3000/api/accounts', {
      method: 'POST',
      body: JSON.stringify({
        accounts: [
          {
            id: 'acc_01',
            name: 'Checking',
            officialName: 'Total Checking',
            mask: '1234',
            type: 'depository',
            subtype: 'checking',
            balances: {
              available: 100.5,
              current: 150.75,
              isoCurrencyCode: 'USD',
            },
            institution: {
              id: 'ins_chase',
              name: 'Chase Bank',
            },
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.accounts).toHaveLength(1);
    expect(data.accounts[0].id).toBe('acc_01');

    // First call seeds the guest profile
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO profiles'),
      expect.any(Array)
    );
    // Second call upserts the account
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO accounts'),
      expect.any(Array)
    );
  });

  it('DELETE /api/accounts/[id] deletes account from PostgreSQL', async () => {
    const queryMock = vi.spyOn(dbLib, 'query').mockResolvedValue([] as never[]);

    const req = new Request('http://localhost:3000/api/accounts/acc_01', {
      method: 'DELETE',
    });

    const res = await DELETE(req, {
      params: Promise.resolve({ id: 'acc_01' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.deletedId).toBe('acc_01');
    expect(queryMock).toHaveBeenCalledWith(
      'DELETE FROM accounts WHERE id = $1 AND user_id = $2',
      ['acc_01', '00000000-0000-0000-0000-000000000000']
    );
  });
});
