import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { BasePathMapping, DomainName, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { InstanceClass, InstanceSize, InstanceType, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Stage } from '../bin/cdk';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Credentials, DatabaseInstance, DatabaseInstanceEngine, MysqlEngineVersion } from 'aws-cdk-lib/aws-rds';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import {
  OAuthScope,
  ProviderAttribute,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolDomain,
  UserPoolIdentityProviderGoogle,
} from 'aws-cdk-lib/aws-cognito';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { BastiAccessSecurityGroup, BastiInstance } from 'basti-cdk';

interface BackendStackProps extends cdk.StackProps {
  stage: Stage;
}

export class BackendStack extends cdk.Stack {
  private readonly stage: Stage;

  constructor(scope: cdk.App, id: string, { stage, ...props }: BackendStackProps) {
    super(scope, id, props);

    this.stage = stage;
    const vpc = this.createVpc();

    const lambdaSecurityGroup = this.createSecurityGroup(vpc, 'lambda');
    const rdsSecurityGroup = this.createSecurityGroup(vpc, 'rds');
    const credentials = this.createRdsCredentials();
    const { bastiInstance, bastiAccessSecurityGroup } = this.createBastionInstance(vpc);
    const databaseInstance = this.createRdsInstance(vpc, [rdsSecurityGroup, bastiAccessSecurityGroup], credentials);
    const databaseUrl = this.createDatabaseUrl(credentials, databaseInstance);
    const nestFunction = this.createNestFunction(vpc, lambdaSecurityGroup, databaseUrl);
    const restApi = this.createRestApi(nestFunction);
    const userPool = this.createCognitoUserPool();

    this.addCustomDomain(restApi);
    this.warmer(nestFunction);
    this.createS3Bucket();

    rdsSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      Port.tcp(3306),
      'Allow Lambda functions to access RDS instance on port 3306',
    );

    bastiAccessSecurityGroup.allowBastiInstanceConnection(bastiInstance, Port.tcp(3306));

    nestFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ['cognito-idp:AdminGetUser'],
        resources: [userPool.userPoolArn],
      }),
    );
  }

  private createVpc() {
    return new Vpc(this, 'BackendVPC', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'IsolatedSubnet',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });
  }

  private createSecurityGroup(vpc: Vpc, name: string) {
    return new SecurityGroup(this, `SecurityGroup-${name}`, {
      vpc: vpc,
    });
  }

  private createNestFunction(vpc: Vpc, securityGroup: SecurityGroup, databaseUrl: string) {
    return new NodejsFunction(this, 'NestFunction', {
      entry: path.join(__dirname, '../../dist/handler.mjs'), // Lambda関数のエントリーポイント
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: Duration.seconds(30),
      vpc: vpc,
      securityGroups: [securityGroup],
      environment: {
        NO_COLOR: 'true',
        DATABASE_URL: databaseUrl,
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME!,
        JWT_SECRET: process.env.JWT_SECRET!,
        JWT_ISSUER: process.env.JWT_ISSUER!,
        JWT_AUDIENCE: process.env.JWT_AUDIENCE!,
      },
    });
  }

  private createRestApi(handler: IFunction) {
    const restApi = new RestApi(this, 'NestApi', {
      restApiName: 'sensing-flow-api',
      description: 'API for Sensing Flow',
      deployOptions: {
        stageName: this.stage,
      },
    });
    restApi.root.addProxy({
      defaultIntegration: new LambdaIntegration(handler),
      anyMethod: true,
    });

    return restApi;
  }

  private warmer(handler: IFunction) {
    const rule = new Rule(this, 'LambdaWarmerRule', {
      schedule: Schedule.rate(Duration.minutes(5)),
    });

    rule.addTarget(
      new LambdaFunction(handler, {
        event: RuleTargetInput.fromObject({ source: 'warmer' }),
      }),
    );
  }

  private addCustomDomain(restApi: RestApi) {
    const certArn = StringParameter.valueForStringParameter(this, `/api-cert-arn/${this.stage}`);

    // ACM 証明書
    const certificate = Certificate.fromCertificateArn(this, 'ApiCert', certArn);

    // カスタムドメイン
    const domain = new DomainName(this, 'CustomDomain', {
      domainName: this.stage === 'prod' ? `sensing-flow-api.satooru.dev` : `sensing-flow-api-${this.stage}.satooru.dev`,
      certificate: certificate,
    });

    // API とドメインをマッピング
    new BasePathMapping(this, 'BasePathMapping', {
      domainName: domain,
      restApi: restApi,
      stage: restApi.deploymentStage,
    });
  }

  private createRdsCredentials() {
    return new Secret(this, 'RdsCredential', {
      secretName: `sensing-flow-rds-credential-${this.stage}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password',
      },
    });
  }

  private createRdsInstance(vpc: Vpc, securityGroups: SecurityGroup[], credentials: Secret) {
    return new DatabaseInstance(this, 'SensingFlowDB', {
      vpc: vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: securityGroups,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE3, InstanceSize.MICRO),
      engine: DatabaseInstanceEngine.mysql({
        version: MysqlEngineVersion.VER_8_0,
      }),
      allocatedStorage: 20,
      multiAz: this.stage === 'prod',
      removalPolicy: this.stage !== 'prod' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      publiclyAccessible: false,
      credentials: Credentials.fromSecret(credentials),
      databaseName: `sensing_flow_${this.stage}`,
    });
  }

  private createS3Bucket() {
    new Bucket(this, 'SensingFlowBucket', {
      bucketName: `sensing-flow-${this.stage}-${this.account}`,
      removalPolicy: this.stage !== 'prod' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      autoDeleteObjects: this.stage !== 'prod',
      versioned: this.stage === 'prod',
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: Duration.days(1),
        },
      ],
    });
  }

  private createDatabaseUrl(credentials: Secret, databaseInstance: DatabaseInstance) {
    const usename = credentials.secretValueFromJson('username').toString();
    const password = credentials.secretValueFromJson('password').toString();
    const host = databaseInstance.dbInstanceEndpointAddress;
    const port = databaseInstance.dbInstanceEndpointPort;
    const database_url = `mysql://${usename}:${password}@${host}:${port}/sensing_flow_${this.stage}`;
    this.exportDatabaseUrl(database_url);

    return database_url;
  }

  private exportDatabaseUrl(dbUrl: string) {
    new StringParameter(this, 'DatabaseUrlParameter', {
      parameterName: `/sensing-flow/${this.stage}/database-url`,
      stringValue: dbUrl,
    });
  }

  private createCognitoUserPool() {
    const userPool = new UserPool(this, 'SensingFlowUserPool', {
      userPoolName: `sensing-flow-user-pool-${this.stage}`,
      signInAliases: { email: true },
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false },
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: false,
      },
    });

    const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPoolClientName: `sensing-flow-user-pool-client-${this.stage}`,
      userPool,
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: true,
        adminUserPassword: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE],
        callbackUrls: process.env.CALLBACK_URLS!.split(','),
        logoutUrls: process.env.LOGOUT_URLS!.split(','),
      },
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO, UserPoolClientIdentityProvider.GOOGLE],
    });

    new UserPoolDomain(this, 'UserPoolCognitoDomain', {
      userPool,
      cognitoDomain: {
        domainPrefix: this.stage === 'prod' ? 'sensing-flow' : `sensing-flow-${this.stage}`,
      },
    });

    const googleIdp = new UserPoolIdentityProviderGoogle(this, 'GoogleIdP', {
      userPool,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scopes: ['openid', 'email', 'profile'],
      attributeMapping: {
        email: ProviderAttribute.GOOGLE_EMAIL,
      },
    });
    userPoolClient.node.addDependency(googleIdp);

    return userPool;
  }

  private createBastionInstance(vpc: Vpc) {
    const bastiInstance = new BastiInstance(this, 'BastionInstance', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      bastiId: `sensing-flow-bastion-${this.stage}`,
    });

    const bastiAccessSecurityGroup = new BastiAccessSecurityGroup(this, 'BastiAccessSecurityGroup', {
      vpc,
      bastiId: `sensing-flow-bastion-${this.stage}`,
    });

    return { bastiInstance, bastiAccessSecurityGroup };
  }
}
