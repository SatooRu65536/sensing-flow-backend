import serverlessExpress from '@codegenie/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';
import { bootstrap } from './bootstrap';

async function bootstrapServer(): Promise<Handler> {
  const app = await bootstrap();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const expressApp = app.getHttpAdapter().getInstance();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return serverlessExpress({ app: expressApp });
}

const server = bootstrapServer();

export const handler: Handler = async (event: any, context: Context, callback: Callback): Promise<unknown> => {
  return (await server)(event, context, callback);
};
