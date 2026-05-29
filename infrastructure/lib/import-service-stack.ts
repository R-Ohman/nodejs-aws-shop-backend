import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';

interface ImportServiceStackProps extends cdk.StackProps {
  catalogItemsQueue: sqs.IQueue;
  basicAuthorizerLambda?: lambda.IFunction;
}

export class ImportServiceStack extends cdk.Stack {
  public readonly restApi: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ImportServiceStackProps) {
    super(scope, id, props);

    const backendPath = path.resolve(process.cwd(), '../../nodejs-aws-shop-backend');
    const bucketName = 'rss-import-275956877398';
    const allowedOrigins = (process.env.ALLOWED_ORIGIN || '*')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const bucket = s3.Bucket.fromBucketName(this, 'ImportBucket', bucketName);

    new cr.AwsCustomResource(this, 'ImportBucketCors', {
      onCreate: {
        service: 'S3',
        action: 'putBucketCors',
        parameters: {
          Bucket: bucketName,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['PUT', 'GET', 'HEAD'],
                AllowedOrigins: allowedOrigins,
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3000,
              },
            ],
          },
        },
        physicalResourceId: cr.PhysicalResourceId.of(`import-bucket-cors-${bucketName}`),
      },
      onUpdate: {
        service: 'S3',
        action: 'putBucketCors',
        parameters: {
          Bucket: bucketName,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['PUT', 'GET', 'HEAD'],
                AllowedOrigins: allowedOrigins,
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3000,
              },
            ],
          },
        },
        physicalResourceId: cr.PhysicalResourceId.of(`import-bucket-cors-${bucketName}`),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [`arn:aws:s3:::${bucketName}`],
      }),
    });

    const importProductsFileFn = new lambda.Function(this, 'ImportProductsFileFunction', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'dist/handlers/importProductsFile.handler',
      code: lambda.Code.fromAsset(backendPath, {
        exclude: ['infrastructure/**', 'cdk.out/**', 'node_modules/**', '.git/**'],
      }),
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      environment: {
        ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || '*',
        BUCKET_NAME: bucketName,
      },
    });

    // Basic authorizer Lambda for validating Basic Authorization header
    const basicAuthorizerFn = new lambda.Function(this, 'BasicAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'dist/handlers/basicAuthorizer.handler',
      code: lambda.Code.fromAsset(backendPath, {
        exclude: ['infrastructure/**', 'cdk.out/**', 'node_modules/**', '.git/**'],
      }),
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      environment: {
        // Fallback to TEST_PASSWORD when no local .env is provided during synth
        R_OHMAN: process.env['R-Ohman'] || process.env['R_OHMAN'] || 'TEST_PASSWORD',
      },
    });

    const importFileParserFn = new lambda.Function(this, 'ImportFileParserFunction', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'dist/handlers/importFileParser.handler',
      code: lambda.Code.fromAsset(backendPath, {
        exclude: ['infrastructure/**', 'cdk.out/**', 'node_modules/**', '.git/**'],
      }),
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      environment: {
        BUCKET_NAME: bucketName,
        CATALOG_ITEMS_QUEUE_URL: props.catalogItemsQueue.queueUrl,
      },
    });

    bucket.grantPut(importProductsFileFn);
    bucket.grantReadWrite(importFileParserFn);
    props.catalogItemsQueue.grantSendMessages(importFileParserFn);

    this.restApi = new apigateway.RestApi(this, 'ImportApi', {
      restApiName: 'Import Service API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    this.restApi.addGatewayResponse('Default4xxCors', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'",
      },
    });

    this.restApi.addGatewayResponse('Default5xxCors', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'",
      },
    });

    const importResource = this.restApi.root.addResource('import');

    const authorizer = new apigateway.RequestAuthorizer(this, 'BasicRequestAuthorizer', {
      handler: basicAuthorizerFn,
      identitySources: [apigateway.IdentitySource.header('Authorization')],
    });

    importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFileFn), {
      requestParameters: {
        'method.request.querystring.name': true,
      },
      authorizer,
    });

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserFn),
      {
        prefix: 'uploaded/',
      }
    );

    new cdk.CfnOutput(this, 'ImportApiUrl', {
      value: this.restApi.url,
      description: 'Base URL for Import API',
    });
  }
}