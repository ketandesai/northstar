import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/accounts/route';
import { DELETE, PATCH } from '@/app/api/accounts/[id]/route';
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
      .mockResolvedValueOnce(mockDbAccounts as never[])
      .mockResolvedValueOnce([] as never[]);

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
    // Third call seeds the balance-history snapshot for today
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO balance_history'),
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

  it('PATCH /api/accounts/[id] updates an asset value and writes a snapshot', async () => {
    const updatedRow = {
      ...mockDbAccounts[0],
      id: 'asset_home_1',
      name: 'Primary Home',
      subtype: 'home',
      current_balance: '525000.00',
      available_balance: null,
      iso_currency_code: 'USD',
    };

    const queryMock = vi
      .spyOn(dbLib, 'query')
      .mockResolvedValueOnce([updatedRow] as never[])
      .mockResolvedValueOnce([] as never[]);

    const req = new Request('http://localhost:3000/api/accounts/asset_home_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Primary Home',
        subtype: 'home',
        currentBalance: 525000,
        isoCurrencyCode: 'USD',
      }),
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: 'asset_home_1' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.account).toMatchObject({
      id: 'asset_home_1',
      name: 'Primary Home',
      subtype: 'home',
      balances: { current: 525000, available: null, isoCurrencyCode: 'USD' },
    });
    expect(data.updated).toContain('current_balance');

    // First call updates the account row
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE accounts'),
      expect.any(Array)
    );
    // Second call writes today's balance-history snapshot
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO balance_history'),
      expect.any(Array)
    );
  });

  it('PATCH /api/accounts/[id] updates linked account name and subtype', async () => {
    const updatedRow = {
      ...mockDbAccounts[0],
      name: 'Everyday Checking',
      subtype: 'savings',
    };

    const queryMock = vi
      .spyOn(dbLib, 'query')
      .mockResolvedValue([updatedRow] as never[]);

    const req = new Request('http://localhost:3000/api/accounts/acc_01', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Everyday Checking', subtype: 'savings' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'acc_01' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.account).toMatchObject({
      id: 'acc_01',
      name: 'Everyday Checking',
      subtype: 'savings',
    });
    expect(data.updated).toEqual(expect.arrayContaining(['name', 'subtype']));
    // Name/subtype edits do not write a balance-history snapshot
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('PATCH /api/accounts/[id] updates the account type', async () => {
    const updatedRow = { ...mockDbAccounts[0], type: 'investment' };

    const queryMock = vi
      .spyOn(dbLib, 'query')
      .mockResolvedValue([updatedRow] as never[]);

    const req = new Request('http://localhost:3000/api/accounts/acc_01', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'Investment' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'acc_01' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updated).toContain('type');

    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toContain('type = $');
    expect(queryMock.mock.calls[0][1]).toContain('investment');
  });

  it('PATCH /api/accounts/[id] updates the account category', async () => {
    const updatedRow = { ...mockDbAccounts[0], category: 'retirement' };

    const queryMock = vi
      .spyOn(dbLib, 'query')
      .mockResolvedValue([updatedRow] as never[]);

    const req = new Request('http://localhost:3000/api/accounts/acc_01', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'retirement' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'acc_01' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.account).toMatchObject({ id: 'acc_01', category: 'retirement' });
    expect(data.updated).toContain('category');

    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toContain('category = $');
    expect(queryMock.mock.calls[0][1]).toContain('retirement');
  });

  it('PATCH /api/accounts/[id] rejects an invalid category', async () => {
    const req = new Request('http://localhost:3000/api/accounts/acc_01', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'nonsense' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'acc_01' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe('INVALID_REQUEST');
  });

  it('PATCH /api/accounts/[id] with no fields returns 400', async () => {
    const queryMock = vi.spyOn(dbLib, 'query').mockResolvedValue([] as never[]);

    const req = new Request('http://localhost:3000/api/accounts/asset_home_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'asset_home_1' }) });

    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('PATCH /api/accounts/[id] returns 404 when the account does not exist', async () => {
    vi.spyOn(dbLib, 'query').mockResolvedValue([] as never[]);

    const req = new Request('http://localhost:3000/api/accounts/does_not_exist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'does_not_exist' }) });

    expect(res.status).toBe(404);
  });
});
