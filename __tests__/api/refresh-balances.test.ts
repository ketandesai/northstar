import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/plaid/refresh-balances/route';
import * as plaidLib from '@/lib/plaid';
import * as sync from '@/lib/plaid-sync';

describe('/api/plaid/refresh-balances', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when Plaid is not configured', async () => {
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(false);

    const res = await POST();
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe('PLAID_NOT_CONFIGURED');
  });

  it('refreshes balances and returns a summary', async () => {
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(true);
    const refreshBalances = vi
      .spyOn(sync, 'refreshBalances')
      .mockResolvedValue({
        itemsRefreshed: 2,
        accountsUpdated: 3,
        snapshotsWritten: 3,
        userIds: ['00000000-0000-0000-0000-000000000000'],
      });

    const res = await POST();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.accountsUpdated).toBe(3);
    expect(refreshBalances).toHaveBeenCalledWith([
      '00000000-0000-0000-0000-000000000000',
    ]);
  });

  it('returns Plaid-style error on failure', async () => {
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(true);
    vi.spyOn(sync, 'refreshBalances').mockRejectedValue({
      response: { data: { error_message: 'Item requires re-authentication', error_code: 'ITEM_LOGIN_REQUIRED' } },
    });

    const res = await POST();
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.code).toBe('ITEM_LOGIN_REQUIRED');
    expect(data.error).toBe('Item requires re-authentication');
  });
});
