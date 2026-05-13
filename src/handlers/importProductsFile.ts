import { APIGatewayProxyHandler } from "aws-lambda";
import path from "path";
import { createImportSignedUrl } from "../services/importService";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const BUCKET_NAME = process.env.BUCKET_NAME || "rss-import-275956877398";

const corsHeaders = {
  "Content-Type": "text/plain",
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: "name query parameter is required",
      };
    }

    const signedUrl = await createImportSignedUrl(BUCKET_NAME, path.basename(fileName));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: signedUrl,
    };
  } catch (err) {
    console.error("importProductsFile error", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: "Internal server error",
    };
  }
};