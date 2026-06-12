import { APIGatewayAuthorizerResult } from 'aws-lambda';

function generatePolicy(principalId: string, effect: 'Allow' | 'Deny', resource: string): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: {
      user: principalId,
    },
  };
}

export const handler = async (event: any) => {
  // Support both REQUEST and TOKEN authorizer event shapes
  const methodArn = event.methodArn || event.method_arn || event.routeArn || event.requestContext?.resourceId || event.methodArn;

  let authHeader: string | undefined;

  if (event.type === 'REQUEST') {
    authHeader = event.headers && (event.headers.Authorization || event.headers.authorization);
  } else if (event.type === 'TOKEN') {
    authHeader = event.authorizationToken;
  } else {
    authHeader = event.authorizationToken || (event.headers && (event.headers.Authorization || event.headers.authorization));
  }

  if (!authHeader) {
    throw new Error('Unauthorized');
  }

  // Expect value like: "Basic base64(username:password)" or just the token
  const token = authHeader.startsWith('Basic ') ? authHeader.slice(6).trim() : authHeader.trim();

  let decoded = '';
  try {
    decoded = Buffer.from(token, 'base64').toString('utf-8');
  } catch (err) {
    // Invalid token
    return generatePolicy('anonymous', 'Deny', methodArn);
  }

  const [username, password] = decoded.split(':');
  if (!username || !password) {
    return generatePolicy('anonymous', 'Deny', methodArn);
  }

  const sanitize = (s: string) => s.replace(/-/g, '_');
  const expected = process.env[username] || process.env[sanitize(username)] || process.env[username.toUpperCase()] || process.env[sanitize(username).toUpperCase()];
  if (!expected || expected !== password) {
    return generatePolicy(username, 'Deny', methodArn);
  }

  return generatePolicy(username, 'Allow', methodArn);
};
