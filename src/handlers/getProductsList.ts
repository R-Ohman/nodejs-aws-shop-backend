import { APIGatewayProxyHandler } from "aws-lambda";
import { getAllProducts } from "../services/productService";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
};

export const handler: APIGatewayProxyHandler = async () => {
  try {
    console.log("getProductsList request");
    const list = await getAllProducts();
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(list),
    };
  } catch (err) {
    console.error("getProductsList error", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
