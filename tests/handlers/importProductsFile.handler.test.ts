import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { handler as importProductsFile } from "../../src/handlers/importProductsFile";
import { createImportSignedUrl } from "../../src/services/importService";

jest.mock("../../src/services/importService", () => ({
  createImportSignedUrl: jest.fn(),
}));

describe("importProductsFile handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with a plain signed url string", async () => {
    (createImportSignedUrl as jest.Mock).mockResolvedValue("https://signed.example/upload");

    const event: Partial<APIGatewayProxyEvent> = {
      queryStringParameters: { name: "products.csv" },
    };

    const context = {} as Context;
    const result = (await importProductsFile(event as APIGatewayProxyEvent, context, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("https://signed.example/upload");
    expect(result.headers?.["Content-Type"]).toBe("text/plain");
    expect(createImportSignedUrl).toHaveBeenCalledWith(expect.any(String), "products.csv");
  });

  it("returns 400 when name is missing", async () => {
    const event: Partial<APIGatewayProxyEvent> = {};
    const context = {} as Context;

    const result = (await importProductsFile(event as APIGatewayProxyEvent, context, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe("name query parameter is required");
  });
});