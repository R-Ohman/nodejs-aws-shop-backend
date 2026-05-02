import { handler as getProductById } from '../../src/handlers/getProductById';

describe('getProductById handler', () => {
  it('returns 200 and product when exists', async () => {
    const event: any = { pathParameters: { productId: '1' } };
    const res = (await getProductById(event, {} as any, {} as any)) as any;
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('id', '1');
  });

  it('returns 404 when not found', async () => {
    const event: any = { pathParameters: { productId: 'nope' } };
    const res = (await getProductById(event, {} as any, {} as any)) as any;
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('message', 'Product not found');
  });
});
