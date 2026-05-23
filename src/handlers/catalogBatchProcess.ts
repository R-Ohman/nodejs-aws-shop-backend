import { SQSEvent } from "aws-lambda";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { createProduct } from "../services/productService";

let snsClient: SNSClient | null = null;

const getSnsClient = (): SNSClient => {
  if (snsClient) {
    return snsClient;
  }

  snsClient = new SNSClient({});
  return snsClient;
};

const getCreateProductTopicArn = (): string => {
  const topicArn = process.env.CREATE_PRODUCT_TOPIC_ARN;

  if (!topicArn) {
    throw new Error("Create product topic ARN is required");
  }

  return topicArn;
};

const parseProductRecord = (body: string) => {
  const payload = JSON.parse(body) as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = typeof payload.description === "string" ? payload.description : undefined;
  const price = Number(payload.price);
  const count = Number(payload.count ?? 0);

  if (
    !title ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isInteger(count) ||
    count < 0
  ) {
    throw new Error("Invalid product record");
  }

  return { title, description, price, count };
};

const publishCreatedProduct = async (product: Awaited<ReturnType<typeof createProduct>>) => {
  const topicArn = getCreateProductTopicArn();

  await getSnsClient().send(
    new PublishCommand({
      TopicArn: topicArn,
      Subject: `Product created: ${product.title}`,
      Message: JSON.stringify(product),
      MessageAttributes: {
        price: {
          DataType: "Number",
          StringValue: product.price.toString(),
        },
        count: {
          DataType: "Number",
          StringValue: product.count.toString(),
        },
        title: {
          DataType: "String",
          StringValue: product.title,
        },
      },
    })
  );
};

export const handler = async (event: SQSEvent): Promise<void> => {
  try {
    for (const record of event.Records) {
      const productData = parseProductRecord(record.body);
      const createdProduct = await createProduct(productData);
      await publishCreatedProduct(createdProduct);
    }
  } catch (error) {
    console.error("catalogBatchProcess error", error);
    throw error;
  }
};