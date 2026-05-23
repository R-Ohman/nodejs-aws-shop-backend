import { Readable } from "stream";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createImportSignedUrl, processImportedFile } from "../src/services/importService";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

jest.mock(
  "csv-parser",
  () => {
    const { Transform } = require("stream");

    return () => {
      let buffer = "";

      return new Transform({
        readableObjectMode: true,
        transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
          buffer += chunk.toString();
          callback();
        },
        flush(callback: (error?: Error | null) => void) {
          const lines = buffer.trim().split(/\r?\n/).filter(Boolean);

          if (lines.length === 0) {
            callback();
            return;
          }

          const headers = lines[0].split(",");

          for (const line of lines.slice(1)) {
            const values = line.split(",");
            const record = headers.reduce<Record<string, string>>((accumulator, header, index) => {
              accumulator[header] = values[index] ?? "";
              return accumulator;
            }, {});

            this.push(record);
          }

          callback();
        },
      });
    };
  },
  { virtual: true }
);

jest.mock(
  "@aws-sdk/client-s3",
  () => ({
    S3Client: class S3Client {
      send = jest.fn();
    },
    PutObjectCommand: class PutObjectCommand {
      input: Record<string, unknown>;

      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    },
    GetObjectCommand: class GetObjectCommand {
      input: Record<string, unknown>;

      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    },
    CopyObjectCommand: class CopyObjectCommand {
      input: Record<string, unknown>;

      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    },
    DeleteObjectCommand: class DeleteObjectCommand {
      input: Record<string, unknown>;

      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    },
  }),
  { virtual: true }
);

const sqsSend = jest.fn();

jest.mock(
  "@aws-sdk/client-sqs",
  () => ({
    SQSClient: class SQSClient {
      send = sqsSend;
    },
    SendMessageCommand: class SendMessageCommand {
      input: Record<string, unknown>;

      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    },
  }),
  { virtual: true }
);

jest.mock(
  "@aws-sdk/s3-request-presigner",
  () => ({
    getSignedUrl: jest.fn(),
  }),
  { virtual: true }
);

describe("importService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CATALOG_ITEMS_QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/123456789012/catalog-items-queue";
  });

  it("creates a signed upload url for the uploaded folder", async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue("https://signed.example/upload");

    const url = await createImportSignedUrl("import-bucket", "products.csv", {} as never);

    expect(url).toBe("https://signed.example/upload");
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    const [, command, options] = (getSignedUrl as jest.Mock).mock.calls[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toMatchObject({
      Bucket: "import-bucket",
      Key: "uploaded/products.csv",
    });
    expect(options).toEqual({ expiresIn: 3600 });
  });

  it("streams csv records, copies the file to parsed, and deletes the original", async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({
        Body: Readable.from(["title,description,price,count\n", "Book,Great book,10,2\n"]),
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    await processImportedFile("import-bucket", "uploaded/products.csv", { send } as never);

    expect(send).toHaveBeenNthCalledWith(1, expect.any(GetObjectCommand));
    expect(sqsSend).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    expect(send).toHaveBeenNthCalledWith(2, expect.any(CopyObjectCommand));
    expect(send).toHaveBeenNthCalledWith(3, expect.any(DeleteObjectCommand));

    const queuedMessage = sqsSend.mock.calls[0][0] as SendMessageCommand;
    expect(queuedMessage.input).toMatchObject({
      QueueUrl: process.env.CATALOG_ITEMS_QUEUE_URL,
      MessageBody: JSON.stringify({
        title: "Book",
        description: "Great book",
        price: "10",
        count: "2",
      }),
    });

    const copyCommand = send.mock.calls[1][0] as CopyObjectCommand;
    expect(copyCommand.input).toMatchObject({
      Bucket: "import-bucket",
      Key: "parsed/products.csv",
      CopySource: "import-bucket/uploaded%2Fproducts.csv",
    });

    expect(logSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });
});