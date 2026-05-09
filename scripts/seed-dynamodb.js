const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

if (!PRODUCTS_TABLE || !STOCKS_TABLE) {
  console.error('Could not find PRODUCTS_TABLE or STOCKS_TABLE env variable');
  process.exit(1);
}

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const sample = [
  { title: 'Nike Sneakers', description: 'Comfortable running shoes', price: 120, count: 10 },
  { title: 'Adidas Sneakers', description: 'Stylish everyday sneakers', price: 95, count: 5 },
  { title: 'Puma Trainers', description: 'Lightweight trainers', price: 80, count: 0 },
];

const clearTable = async (tableName, keyName) => {
  const response = await ddb.send(new ScanCommand({ TableName: tableName }));
  const items = response.Items ?? [];

  for (const item of items) {
    const key = item[keyName];
    if (typeof key === 'undefined') {
      continue;
    }

    await ddb.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { [keyName]: key },
      })
    );
  }
};

const run = async () => {
  console.log('Clearing existing rows');
  await clearTable(PRODUCTS_TABLE, 'id');
  await clearTable(STOCKS_TABLE, 'product_id');

  for (const item of sample) {
    const id = randomUUID();
    console.log('Creating product', item.title);
    await ddb.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: { id, title: item.title, description: item.description, price: item.price } }));
    await ddb.send(new PutCommand({ TableName: STOCKS_TABLE, Item: { product_id: id, count: item.count } }));
  }
  console.log('Done');
};

run().catch((err) => {
  console.error('Seed error', err);
  process.exit(1);
});
