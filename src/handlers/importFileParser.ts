import { S3Handler } from "aws-lambda";
import { processImportedFile } from "../services/importService";

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    await processImportedFile(bucketName, objectKey);
  }
};