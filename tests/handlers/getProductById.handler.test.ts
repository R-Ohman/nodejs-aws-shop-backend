import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler as getProductById } from '../../src/handlers/getProductById';

describe('getProductById handler', () => {
  it('returns 200 and product when exists', async () => {
    const event: Partial<APIGatewayProxyEvent> = { pathParameters: { productId: '1' } };
    const context = {} as Context;
    const res = (await getProductById(event as APIGatewayProxyEvent, context, () => {})) as APIGatewayProxyResult;
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('id', '1');
  });

  it('returns 404 when not found', async () => {
    const event: Partial<APIGatewayProxyEvent> = { pathParameters: { productId: 'nope' } };
    const context = {} as Context;
    const res = (await getProductById(event as APIGatewayProxyEvent, context, () => {})) as APIGatewayProxyResult;
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('message', 'Product not found');
  });
});
