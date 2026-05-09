import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler as getProductsList } from '../../src/handlers/getProductsList';

describe('getProductsList handler', () => {
  it('returns 200 and array body', async () => {
    const event: Partial<APIGatewayProxyEvent> = { httpMethod: 'GET' };
    const context = {} as Context;
    const res = (await getProductsList(event as APIGatewayProxyEvent, context, () => {})) as APIGatewayProxyResult;
    expect(res.statusCode).toBe(200);
    expect(res.headers?.['Content-Type']).toBe('application/json');
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});
