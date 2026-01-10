import serverlessExpress from '@codegenie/serverless-express';
import type { Callback, Context, Handler } from 'aws-lambda';
import { bootstrap } from '../bootstrap';

async function bootstrapServer(): Promise<Handler> {
  const app = await bootstrap();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const expressApp = app.getHttpAdapter().getInstance();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return serverlessExpress({ app: expressApp });
}

let server: Handler;

export const handler: Handler = async (
  event: { source?: string },
  context: Context,
  callback: Callback,
): Promise<unknown> => {
  if (event.source === 'warmer') {
    return { statusCode: 200, body: 'Lambda is warm' };
  }

  if (!server) server = await bootstrapServer();

  return await server(event, context, callback);
};
