import { APIGatewayProxyHandler } from "aws-lambda";
import { createProduct } from "../services/productService";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    console.log("createProduct request", event.body);
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Body is required" }),
      };
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Invalid JSON body" }),
      };
    }

    const payload = body as Record<string, unknown>;
    const { title, description, price, count } = payload;

    const numericPrice = Number(price);
    const numericCount = Number(count ?? 0);

    if (
      typeof title !== "string" ||
      !title.trim() ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0 ||
      !Number.isInteger(numericCount) ||
      numericCount < 0
    ) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Invalid product data" }),
      };
    }

    const created = await createProduct({
      title,
      description: typeof description === "string" ? description : undefined,
      price: numericPrice,
      count: numericCount,
    });

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(created),
    };
  } catch (err) {
    console.error('createProduct error', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
