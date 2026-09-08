import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import type { Account, APIEvent, APIResponse } from './types';
import { handler as timeEntriesHandler } from './time-entries';
import { handler as accountsHandler } from './accounts';

const dynamo = new DynamoDBClient();

export const handler = async (event: APIEvent): Promise<APIResponse> => {
  const route = `${event.requestContext.http.method} ${event.requestContext.http.path}`;
  const user = await getLoggedInUser(event.headers);

  if (event.requestContext.http.path.startsWith('/api/time')) {
    return await timeEntriesHandler(route, user, event);
  } else if (event.requestContext.http.path.startsWith('/api/accounts')) {
    return await accountsHandler(route, user);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'not_found' }),
    headers: {
      'Content-Type': 'application/json',
    },
  };
};

async function getLoggedInUser(headers: { authorization?: string }): Promise<Account | null> {
  const auth = headers.authorization;
  if (auth?.startsWith('Basic ')) {
    const [apiKey] = Buffer.from(auth.slice(6), 'base64').toString('ascii').split(':', 1);
    const getCommand = new GetItemCommand({
      TableName: 'accounts',
      Key: { apiKey: { S: apiKey } },
    });
    const user = await dynamo.send(getCommand);
    if (user.Item?.apiKey.S && user.Item?.admin.BOOL !== undefined) {
      return { apiKey: user.Item.apiKey.S, admin: user.Item.admin.BOOL } as Account;
    }
    return null;
  }
  return null;
}
