import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { BasePathMapping, DomainName, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { Duration } from 'aws-cdk-lib';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Stage } from '../bin/cdk';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';

interface BackendStackProps extends cdk.StackProps {
  stage: Stage;
}

export class BackendStack extends cdk.Stack {
  private readonly stage: Stage;
  private readonly vpc: Vpc;
  private readonly securityGroup: SecurityGroup;
  public readonly nestFunction: NodejsFunction;
  public readonly restApi: RestApi;

  constructor(scope: cdk.App, id: string, { stage, ...props }: BackendStackProps) {
    super(scope, id, props);

    this.stage = stage;
    this.vpc = new Vpc(this, 'BackendVPC', {
      maxAzs: 2,
    });
    this.securityGroup = new SecurityGroup(this, 'BackendSecurityGroup', {
      vpc: this.vpc,
    });

    this.nestFunction = this.createNestFunction();
    this.restApi = this.createRestApi();
    this.addCustomDomain();
    this.warmer();
  }

  private createNestFunction() {
    return new NodejsFunction(this, 'NestFunction', {
      entry: path.join(__dirname, '../../dist/handler.mjs'), // Lambda関数のエントリーポイント
      handler: 'handler',
      runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      vpc: this.vpc,
      securityGroups: [this.securityGroup],
      environment: {
        NO_COLOR: 'true',
      },
    });
  }

  private createRestApi() {
    const restApi = new RestApi(this, 'NestApi', {
      restApiName: 'sensing-flow-api',
      description: 'API for Sensing Flow',
      deployOptions: {
        stageName: this.stage,
      },
    });
    restApi.root.addProxy({
      defaultIntegration: new LambdaIntegration(this.nestFunction),
      anyMethod: true,
    });

    return restApi;
  }

  private warmer() {
    const rule = new Rule(this, 'LambdaWarmerRule', {
      schedule: Schedule.rate(Duration.minutes(5)),
    });

    rule.addTarget(
      new LambdaFunction(this.nestFunction, {
        event: RuleTargetInput.fromObject({ source: 'warmer' }),
      }),
    );
  }

  private addCustomDomain() {
    // ACM 証明書
    const certificate = Certificate.fromCertificateArn(
      this,
      'ApiCert',
      `arn:aws:acm:${this.region}:${this.account}:certificate/9f1620c1-fe95-4e9a-b358-94eaa8f88e91`,
    );

    // カスタムドメイン
    const domain = new DomainName(this, 'CustomDomain', {
      domainName: this.stage === 'prod' ? `sensing-flow-api.satooru.dev` : `sensing-flow-api-${this.stage}.satooru.dev`,
      certificate: certificate,
    });

    // API とドメインをマッピング
    new BasePathMapping(this, 'BasePathMapping', {
      domainName: domain,
      restApi: this.restApi,
      stage: this.restApi.deploymentStage,
    });
  }
}
