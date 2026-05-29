import { SQSEvent } from "aws-lambda";
import { handler as catalogBatchProcess } from "../../src/handlers/catalogBatchProcess";
import { createProduct } from "../../src/services/productService";
import { PublishCommand } from "@aws-sdk/client-sns";

const snsSend = jest.fn();

jest.mock("../../src/services/productService", () => ({
  createProduct: jest.fn(),
}));

jest.mock(
  "@aws-sdk/client-sns",
  () => ({
    SNSClient: jest.fn().mockImplementation(() => ({
      send: snsSend,
    })),
    PublishCommand: class PublishCommand {
      input: Record<string, unknown>;

      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    },
  }),
  { virtual: true }
);

describe("catalogBatchProcess handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CREATE_PRODUCT_TOPIC_ARN = "arn:aws:sns:eu-north-1:123456789012:create-product-topic";
  });

  it("creates products for every SQS record and publishes notifications", async () => {
    (createProduct as jest.Mock)
      .mockResolvedValueOnce({ id: "1", title: "Book", description: "Great book", price: 10, count: 2 })
      .mockResolvedValueOnce({ id: "2", title: "Pen", price: 5, count: 1 });

    const event = {
      Records: [
        {
          body: JSON.stringify({ title: "Book", description: "Great book", price: "10", count: "2" }),
        },
        {
          body: JSON.stringify({ title: "Pen", price: "5", count: "1" }),
        },
      ],
    } as SQSEvent;

    await catalogBatchProcess(event);

    expect(createProduct).toHaveBeenNthCalledWith(1, {
      title: "Book",
      description: "Great book",
      price: 10,
      count: 2,
    });
    expect(createProduct).toHaveBeenNthCalledWith(2, {
      title: "Pen",
      description: undefined,
      price: 5,
      count: 1,
    });

    expect(snsSend).toHaveBeenCalledTimes(2);

    const publishedMessage = snsSend.mock.calls[0][0] as PublishCommand;
    expect(publishedMessage.input).toMatchObject({
      TopicArn: process.env.CREATE_PRODUCT_TOPIC_ARN,
      Subject: "Product created: Book",
      Message: JSON.stringify({ id: "1", title: "Book", description: "Great book", price: 10, count: 2 }),
      MessageAttributes: {
        price: {
          DataType: "Number",
          StringValue: "10",
        },
        count: {
          DataType: "Number",
          StringValue: "2",
        },
        title: {
          DataType: "String",
          StringValue: "Book",
        },
      },
    });
  });
});