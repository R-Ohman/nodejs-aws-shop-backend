import * as http from 'node:http';
import * as url from 'node:url';
import axios from 'axios';

const PORT = parseInt(process.env.PORT || '3000', 10);

const serviceMap: Record<string, string | undefined> = {
  cart: process.env.CART_SERVICE_URL,
  product: process.env.PRODUCT_SERVICE_URL,
};

const CACHE_TTL_MS = 2 * 60 * 1000;

interface CacheEntry {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  data: Buffer;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function isProductsListRequest(serviceName: string, forwardPath: string, method: string) {
  return serviceName === 'product' && method === 'GET' && /^\/products\/?$/.test(forwardPath);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url || '/', true);
  const parts = (parsedUrl.pathname || '/').split('/').filter(Boolean);
  const [serviceName, ...rest] = parts;

  const baseUrl = serviceMap[serviceName];
  if (!baseUrl) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Cannot process request' }));
    return;
  }

  const forwardPath = '/' + rest.join('/');
  const targetUrl = baseUrl.replace(/\/$/, '') + forwardPath + (parsedUrl.search || '');
  const method = req.method || 'GET';

  if (isProductsListRequest(serviceName, forwardPath, method)) {
    const cached = cache.get(targetUrl);
    if (cached && Date.now() < cached.expiresAt) {
      res.writeHead(cached.status, cached.headers as http.OutgoingHttpHeaders);
      res.end(cached.data);
      return;
    }
  }

  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', async () => {
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
    const headers = { ...req.headers };
    delete headers.host;

    try {
      const upstream = await axios({
        method: method as any,
        url: targetUrl,
        headers,
        data: body,
        responseType: 'arraybuffer',
        validateStatus: () => true,
      });

      if (isProductsListRequest(serviceName, forwardPath, method) && upstream.status === 200) {
        cache.set(targetUrl, {
          status: upstream.status,
          headers: upstream.headers as Record<string, string | string[] | undefined>,
          data: Buffer.from(upstream.data),
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }

      res.writeHead(upstream.status, upstream.headers as http.OutgoingHttpHeaders);
      res.end(upstream.data);
    } catch {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Cannot process request' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`BFF service listening on port ${PORT}`);
});
