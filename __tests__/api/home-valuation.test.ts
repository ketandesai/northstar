import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/valuation/home/route';

describe('GET /api/valuation/home', () => {
  it('returns 400 when address is missing', async () => {
    const req = new Request('http://localhost:3000/api/valuation/home');
    const res = await GET(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/address is required/i);
    expect(data.code).toBe('INVALID_REQUEST');
  });

  it('returns 400 when address is blank or too short', async () => {
    const req = new Request('http://localhost:3000/api/valuation/home?address=%20%20');
    const res = await GET(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/address is required/i);
  });

  it('returns 200 with valuation for a valid address', async () => {
    const req = new Request(
      'http://localhost:3000/api/valuation/home?address=742%20Evergreen%20Terrace%2C%20Springfield'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.valuation).toBeDefined();
    expect(data.valuation.estimatedValue).toBeGreaterThan(0);
    expect(data.valuation.address).toBe('742 Evergreen Terrace, Springfield');
    expect(data.valuation.currency).toBe('USD');
  });
});
