import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/balance-history/route';
import * as dbLib from '@/lib/db';

describe('/api/balance-history', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns formatted net-worth points', async () => {
    vi.spyOn(dbLib, 'query').mockResolvedValue([
      { date: '2026-08-01', net_worth: '12345.5' },
      { date: '2026-08-02', net_worth: '12600' },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.points).toEqual([
      { date: '2026-08-01', netWorth: 12345.5 },
      { date: '2026-08-02', netWorth: 12600 },
    ]);
  });

  it('returns an empty points array when there is no history', async () => {
    vi.spyOn(dbLib, 'query').mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.points).toEqual([]);
  });

  it('returns a DB_QUERY_ERROR with a migration hint when the table is missing', async () => {
    const error = new Error('relation "balance_history" does not exist');
    (error as Error & { code?: string }).code = '42P01';
    vi.spyOn(dbLib, 'query').mockRejectedValue(error);

    const res = await GET();
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.code).toBe('DB_QUERY_ERROR');
    expect(data.error).toContain('tables not initialized');
    expect(data.hint).toContain('SQL schema migrations');
  });

  it('returns a 500 with the error message for unexpected failures', async () => {
    vi.spyOn(dbLib, 'query').mockRejectedValue(new Error('boom'));

    const res = await GET();
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.code).toBe('INTERNAL_SERVER_ERROR');
    expect(data.error).toBe('boom');
  });
});