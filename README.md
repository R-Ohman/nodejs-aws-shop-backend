# Product Service - AWS Lambda Backend

AWS Lambda microservice providing product catalog API via API Gateway. Built with Node.js 24.x, TypeScript, AWS CDK, and Jest.

## Quick Start

```bash
npm install
npm run build
npm test
```

## API Endpoints

- `GET /products` - Returns array of all products
- `GET /products/{productId}` - Returns single product or 404

## Project Structure

- `src/data/` - Mock product data
- `src/services/` - Business logic
- `src/handlers/` - Lambda handlers (split across separate files)
- `tests/` - Unit tests for services and handlers (6 tests, all passing)
- `openapi.yaml` - Swagger documentation

## Deployment

```bash
cd infrastructure
npm install
npm run build
npx cdk deploy
```

Uses `ALLOWED_ORIGIN` env var for CORS (default: `*`). Set before deployment to restrict to specific origins:

```bash
export ALLOWED_ORIGIN="https://your-domain.cloudfront.net"
```

## Notes

- Runtime: Node.js 24.x
- Memory: 128 MB per Lambda
- Timeout: 10 seconds
- Region: eu-north-1
- CORS: Configured at both Lambda and API Gateway levels
- OpenAPI docs: View `openapi.yaml` at https://editor.swagger.io/
