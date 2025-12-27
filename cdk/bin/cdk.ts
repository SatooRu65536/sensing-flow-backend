import { App } from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';

export type Stage = 'dev' | 'staging' | 'prod';

const app = new App();
const stage: Stage = (app.node.tryGetContext('stage') as Stage) || 'dev';

new BackendStack(app, `BackendStack-${stage}`, { stage });
