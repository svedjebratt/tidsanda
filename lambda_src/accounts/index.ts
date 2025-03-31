import { DynamoDBClient, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { Account, APIEvent, APIResponse } from '../types';
import { parseRoute } from '../parseRoute';

const dynamo = new DynamoDBClient();

export const handler = async (route: string, user: Account | null, event: APIEvent): Promise<APIResponse> => {
  let body: any;
  let statusCode = 200;
  const headers = {
    'Content-Type': 'application/json',
  };

  const routeParser = parseRoute(route);

  if (routeParser.parse(/^GET \/api\/accounts\/(.*)$/)) {
    console.log('GET /api/accounts/:apiKey', routeParser.getGroups());
    const apiKey = routeParser.getGroups()[0];
    console.log('apiKey', apiKey, 'user', user);
    if (!user || user.apiKey !== apiKey) {
      statusCode = 401;
      body = { error: 'not_authorized' };
    } else {
      body = { apiKey: user.apiKey, admin: user.admin };
    }
  } else if (routeParser.parse(/^POST \/api\/accounts$/)) {
    body = {
      apiKey: createApiKey(),
      admin: false,
    };
    await dynamo.send(
      new PutItemCommand({
        TableName: 'accounts',
        Item: {
          apiKey: { S: body.apiKey },
          admin: { BOOL: body.admin },
        },
      })
    );
  } else if (routeParser.parse(/^GET \/api\/accounts$/)) {
    if (!user) {
      statusCode = 401;
      body = { error: 'not_authorized' };
    } else if (!user.admin) {
      body = [{ apiKey: user.apiKey, admin: false }];
    } else {
      body = (
        await dynamo.send(
          new ScanCommand({
            TableName: 'accounts',
          })
        )
      ).Items?.map((item) => ({ apiKey: item.apiKey.S, admin: item.admin.BOOL }));
    }
  }

  body = JSON.stringify(body);

  return {
    statusCode,
    body,
    headers,
  };

  // try {
  //   switch (route) {
  //     case 'GET /api/accounts/{apiKey}': {
  //       if (!user) {
  //         statusCode = 404;
  //         body = { error: 'not_authorized' };
  //         break;
  //       }

  //       body = { apiKey: user.apiKey, admin: user.admin };
  //       break;
  //     }
  //     case 'POST /api/accounts': {
  //       body = {
  //         apiKey: createApiKey(),
  //         admin: false,
  //       };
  //       await dynamo.send(
  //         new PutItemCommand({
  //           TableName: 'accounts',
  //           Item: {
  //             apiKey: { S: body.apiKey },
  //             admin: { BOOL: body.admin },
  //           },
  //         })
  //       );
  //       break;
  //     }
  //     case 'GET /api/accounts': {
  //       if (!user) {
  //         statusCode = 404;
  //         body = { error: 'not_authorized' };
  //         break;
  //       }

  //       if (!user.admin) {
  //         body = [{ apiKey: user.apiKey, admin: false }];
  //         break;
  //       }

  //       body = (
  //         await dynamo.send(
  //           new ScanCommand({
  //             TableName: 'accounts',
  //           })
  //         )
  //       ).Items;
  //       break;
  //     }
  //     default:
  //       throw new Error(`Unsupported route: "${route}"`);
  //   }
  // } catch (err) {
  //   statusCode = 400;
  //   body = err instanceof Error ? err.message : 'Unknown error';
  // } finally {
  //   body = JSON.stringify(body);
  // }

  // return {
  //   statusCode,
  //   body,
  //   headers,
  // };
};

const chars = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'x',
  'y',
  'z',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
];

function createApiKey(): string {
  const key: string[] = [];
  for (let i = 0; i < 8; i++) {
    key.push(chars[Math.round(Math.random() * chars.length)]);
  }
  return key.join('');
}
