import { handler as getProductsList } from '../../src/handlers/getProductsList';

describe('getProductsList handler', () => {
  it('returns 200 and array body', async () => {
    const res = (await getProductsList({} as any, {} as any, {} as any)) as any;
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});
