import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export interface AuthorizationServiceStackProps extends cdk.StackProps {}

export class AuthorizationServiceStack extends cdk.Stack {
  public readonly basicAuthorizerFn: lambda.IFunction;

  constructor(scope: Construct, id: string, props?: AuthorizationServiceStackProps) {
    super(scope, id, props);

    const backendPath = path.resolve(process.cwd(), '../../nodejs-aws-shop-backend');

    const basicAuthorizerFn = new lambda.Function(this, 'BasicAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'dist/handlers/basicAuthorizer.handler',
      code: lambda.Code.fromAsset(backendPath, {
        exclude: ['infrastructure/**', 'cdk.out/**', 'node_modules/**', '.git/**'],
      }),
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      environment: {
        R_OHMAN: process.env['R-Ohman'] || '',
      },
    });

    this.basicAuthorizerFn = basicAuthorizerFn;
  }
}
