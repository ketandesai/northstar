import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as plaidLib from '@/lib/plaid';
import { POST } from '@/app/api/plaid/create-link-token/route';
import { AxiosResponse } from 'axios';
import { LinkTokenCreateResponse } from 'plaid';

describe('/api/plaid/create-link-token', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when Plaid is not configured', async () => {
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(false);

    const req = new Request('http://localhost:3000/api/plaid/create-link-token', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe('PLAID_NOT_CONFIGURED');
    expect(data.error).toContain('Plaid credentials not configured');
  });

  it('returns link_token on successful creation when configured', async () => {
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(true);
    vi.spyOn(plaidLib.plaidClient, 'linkTokenCreate').mockResolvedValue({
      data: {
        link_token: 'link-sandbox-test-123456',
        expiration: '2026-08-30T00:00:00Z',
        request_id: 'req_123',
      },
    } as AxiosResponse<LinkTokenCreateResponse>);

    const req = new Request('http://localhost:3000/api/plaid/create-link-token', {
      method: 'POST',
      body: JSON.stringify({ userId: 'test_user_1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.link_token).toBe('link-sandbox-test-123456');
    expect(data.expiration).toBe('2026-08-30T00:00:00Z');
  });

  it('handles Plaid API error responses correctly', async () => {
    vi.spyOn(plaidLib, 'isPlaidConfigured', 'get').mockReturnValue(true);
    vi.spyOn(plaidLib.plaidClient, 'linkTokenCreate').mockRejectedValue({
      response: {
        data: {
          error_message: 'Invalid client credentials',
          error_code: 'INVALID_CREDENTIALS',
          display_message: 'Your credentials could not be verified.',
        },
      },
    });

    const req = new Request('http://localhost:3000/api/plaid/create-link-token', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe('Invalid client credentials');
    expect(data.code).toBe('INVALID_CREDENTIALS');
  });
});
