import { S3Event, Context } from "aws-lambda";
import { handler as importFileParser } from "../../src/handlers/importFileParser";
import { processImportedFile } from "../../src/services/importService";

jest.mock("../../src/services/importService", () => ({
  processImportedFile: jest.fn(),
}));

describe("importFileParser handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("decodes the uploaded key and passes the record to the import service", async () => {
    const event = {
      Records: [
        {
          s3: {
            bucket: { name: "import-bucket" },
            object: { key: "uploaded%2Fproducts%20list.csv" },
          },
        },
      ],
    } as unknown as S3Event;

    await importFileParser(event, {} as Context, () => {});

    expect(processImportedFile).toHaveBeenCalledWith("import-bucket", "uploaded/products list.csv");
  });
});