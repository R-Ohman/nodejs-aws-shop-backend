import { APIGatewayProxyHandler } from "aws-lambda";
import { getAllProducts } from "../services/productService";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const list = await getAllProducts();
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(list),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
