import { products as localProducts, Product } from "../data/products";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  ScanCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

let ddbClient: DynamoDBDocumentClient | null = null;
const getDdbClient = () => {
  if (ddbClient) return ddbClient;
  const client = new DynamoDBClient({});
  ddbClient = DynamoDBDocumentClient.from(client);
  return ddbClient;
};

export const getAllProducts = async (): Promise<Product[]> => {
  if (!PRODUCTS_TABLE || !STOCKS_TABLE) {
    return localProducts;
  }

  const ddb = getDdbClient();

  const productsResp = await ddb.send(new ScanCommand({ TableName: PRODUCTS_TABLE }));
  const productsItems = productsResp.Items ?? [];

  const stocksResp = await ddb.send(new ScanCommand({ TableName: STOCKS_TABLE }));
  const stocksItems = stocksResp.Items ?? [];

  const stockMap = new Map<string, number>();
  for (const s of stocksItems) {
    const pid = (s as any).product_id as string;
    const cnt = Number((s as any).count ?? 0);
    if (pid) stockMap.set(pid, cnt);
  }

  const result: Product[] = productsItems.map((p: any) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    price: Number(p.price),
    count: stockMap.get(p.id) ?? 0,
  }));

  return result;
};

export const getProductById = async (id: string): Promise<Product | null> => {
  if (!PRODUCTS_TABLE || !STOCKS_TABLE) {
    const p = localProducts.find((x) => x.id === id);
    return p ?? null;
  }

  const ddb = getDdbClient();
  const pResp = await ddb.send(new GetCommand({ TableName: PRODUCTS_TABLE, Key: { id } }));
  const pItem = pResp.Item as any;
  if (!pItem) return null;

  const sResp = await ddb.send(new GetCommand({ TableName: STOCKS_TABLE, Key: { product_id: id } }));
  const sItem = sResp.Item as any;

  const product: Product = {
    id: pItem.id,
    title: pItem.title,
    description: pItem.description,
    price: Number(pItem.price),
    count: Number(sItem?.count ?? 0),
  };

  return product;
};

export const createProduct = async (data: {
  title: string;
  description?: string;
  price: number;
  count?: number;
}): Promise<Product> => {
  const { title, description, price, count = 0 } = data;
  const id = randomUUID();

  if (!PRODUCTS_TABLE || !STOCKS_TABLE) {
    const newProduct: Product = { id, title, description, price, count } as Product;
    // push to local array (for local dev only)
    (localProducts as Product[]).push(newProduct);
    return newProduct;
  }

  const ddb = getDdbClient();

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: PRODUCTS_TABLE,
            Item: { id, title, description, price },
          },
        },
        {
          Put: {
            TableName: STOCKS_TABLE,
            Item: { product_id: id, count },
          },
        },
      ],
    })
  );

  const created: Product = { id, title, description, price, count } as Product;
  return created;
};

export default { getAllProducts, getProductById, createProduct };
