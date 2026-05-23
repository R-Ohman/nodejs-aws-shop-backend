declare module "@aws-sdk/client-s3" {
  export class S3Client {
    constructor(config?: Record<string, unknown>);

    send(command: unknown): Promise<{ Body?: unknown }>;
  }

  export class PutObjectCommand {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>);
  }

  export class GetObjectCommand {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>);
  }

  export class CopyObjectCommand {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>);
  }

  export class DeleteObjectCommand {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>);
  }
}

declare module "@aws-sdk/s3-request-presigner" {
  export function getSignedUrl(client: unknown, command: unknown, options: { expiresIn: number }): Promise<string>;
}