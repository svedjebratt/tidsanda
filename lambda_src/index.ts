import { Account, APIEvent } from './types';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { handler as timeEntriesHandler } from './time-entries';
import { handler as accountsHandler } from './accounts';

const dynamo = new DynamoDBClient();

export const handler = async (event: APIEvent): Promise<any> => {
  console.log('full event', event, JSON.stringify(event));
  const route = `${event.requestContext.http.method} ${event.requestContext.http.path}`;
  console.log('route', route);
  const user = await getLoggedInUser(event.headers);

  if (event.requestContext.http.path.startsWith('/api/time')) {
    return await timeEntriesHandler(route, user, event);
  } else if (event.requestContext.http.path.startsWith('/api/accounts')) {
    return await accountsHandler(route, user, event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'not_found' }),
    headers: {
      'Content-Type': 'application/json',
    },
  };
};

async function getLoggedInUser(headers: { authorization: string }): Promise<Account | null> {
  const auth = headers.authorization;
  if (auth?.startsWith('Basic ')) {
    const userPass = Buffer.from(auth.substr(6), 'base64').toString('ascii');
    const apiKey = userPass.substr(0, userPass.length - 1);
    const getCommand = new GetItemCommand({
      TableName: 'accounts',
      Key: { apiKey: { S: apiKey } },
    });
    console.log('get user', apiKey, getCommand);
    const user = await dynamo.send(getCommand);
    console.log('found user', user);
    if (user.Item?.apiKey.S && user.Item?.admin.BOOL !== undefined) {
      return { apiKey: user.Item.apiKey.S, admin: user.Item.admin.BOOL } as Account;
    }
    return null;
  }
  return null;
}
