import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import csvParser from "csv-parser";

type S3Sender = Pick<S3Client, "send">;

const DEFAULT_URL_EXPIRATION_SECONDS = 3600;

let s3Client: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (s3Client) {
    return s3Client;
  }

  s3Client = new S3Client({});
  return s3Client;
};

export const createImportSignedUrl = async (
  bucketName: string,
  fileName: string,
  client: S3Client = getS3Client()
): Promise<string> => {
  if (!bucketName) {
    throw new Error("Bucket name is required");
  }

  if (!fileName.trim()) {
    throw new Error("File name is required");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: `uploaded/${fileName}`,
  });

  return getSignedUrl(client, command, { expiresIn: DEFAULT_URL_EXPIRATION_SECONDS });
};

const toReadableStream = (body: unknown): NodeJS.ReadableStream => {
  if (body && typeof (body as NodeJS.ReadableStream).pipe === "function") {
    return body as NodeJS.ReadableStream;
  }

  throw new Error("S3 object body is not a readable stream");
};

export const processImportedFile = async (
  bucketName: string,
  objectKey: string,
  client: S3Sender = getS3Client()
): Promise<void> => {
  if (!bucketName) {
    throw new Error("Bucket name is required");
  }

  if (!objectKey) {
    throw new Error("Object key is required");
  }

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    })
  );

  const readableStream = toReadableStream(response.Body);

  await new Promise<void>((resolve, reject) => {
    readableStream
      .pipe(csvParser())
      .on("data", (record) => {
        console.log("Parsed CSV record", record);
      })
      .on("error", reject)
      .on("end", resolve);
  });

  const parsedKey = objectKey.startsWith("uploaded/")
    ? objectKey.replace(/^uploaded\//, "parsed/")
    : `parsed/${objectKey.split("/").pop() ?? objectKey}`;

  await client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${encodeURIComponent(objectKey)}`,
      Key: parsedKey,
    })
  );

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    })
  );
};
