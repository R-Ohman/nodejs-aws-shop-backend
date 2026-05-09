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

    const body = JSON.parse(event.body);
    const { title, description, price, count, image } = body;

    if (!title || typeof price === 'undefined') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Invalid product data" }),
      };
    }

    const created = await createProduct({ title, description, price: Number(price), count: Number(count ?? 0), image });

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
