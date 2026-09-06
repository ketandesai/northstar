import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/cron/refresh-balances/route';
import * as plaidLib from '@/lib/plaid';
import * as dbLib from '@/lib/db';

describe('/api/cron/refresh-balances', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('returns 401 when no CRON_SECRET is configured', async () => {
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(true);
    vi.spyOn(dbLib, 'query').mockResolvedValue([]);

    const req = new Request('http://localhost:3000/api/cron/refresh-balances');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when the secret does not match', async () => {
    process.env.CRON_SECRET = 'top-secret';
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(true);
    vi.spyOn(dbLib, 'query').mockResolvedValue([]);

    const req = new Request('http://localhost:3000/api/cron/refresh-balances', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('refreshes balances for all users when authorized', async () => {
    process.env.CRON_SECRET = 'top-secret';
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(true);
    vi.spyOn(dbLib, 'query').mockResolvedValue([
      { user_id: '00000000-0000-0000-0000-000000000000' },
    ]);

    const sync = await import('@/lib/plaid-sync');
    const refreshBalances = vi
      .spyOn(sync, 'refreshBalances')
      .mockResolvedValue({
        itemsRefreshed: 1,
        accountsUpdated: 2,
        snapshotsWritten: 2,
        userIds: ['00000000-0000-0000-0000-000000000000'],
      });

    const req = new Request('http://localhost:3000/api/cron/refresh-balances', {
      headers: { authorization: 'Bearer top-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.accountsUpdated).toBe(2);
    expect(refreshBalances).toHaveBeenCalledWith([
      '00000000-0000-0000-0000-000000000000',
    ]);
  });
});
