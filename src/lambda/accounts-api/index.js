const AWS = require('aws-sdk');

const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  let body;
  let statusCode = 200;
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    switch (event.routeKey) {
      case 'GET /api/accounts/{apiKey}': {
        const user = await getLoggedInUser(event.headers);
        if (!user) {
          statusCode = 404;
          body = { error: 'not_authorized' };
          break;
        }

        body = { apiKey: user.apiKey, admin: user.admin };
        break;
      }
      case 'POST /api/accounts':
        body = {
          apiKey: createApiKey(),
          admin: false,
        };
        await dynamo
          .put({
            TableName: 'accounts',
            Item: body,
          })
          .promise();
        break;
      case 'GET /api/accounts':
        const user = await getLoggedInUser(event.headers);
        if (!user) {
          statusCode = 404;
          body = { error: 'not_authorized' };
          break;
        }

        if (!user.admin) {
          body = [{ apiKey: user.apiKey, admin: false }];
          break;
        }

        body = (
          await dynamo
            .scan({
              TableName: 'accounts',
            })
            .promise()
        ).Items;
        break;
      default:
        throw new Error(`Unsupported route: "${event.routeKey}"`);
    }
  } catch (err) {
    statusCode = 400;
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
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
function createApiKey() {
  const key = [];
  for (let i = 0; i < 8; i++) {
    key.push(chars[Math.round(Math.random() * chars.length)]);
  }
  return key.join('');
}

async function getLoggedInUser(headers) {
  const auth = headers.authorization;
  if (auth.startsWith('Basic ')) {
    const userPass = Buffer.from(auth.substr(6), 'base64').toString('ascii');
    const apiKey = userPass.substr(0, userPass.length - 1);
    const user = await dynamo
      .get({
        TableName: 'accounts',
        Key: {
          apiKey,
        },
      })
      .promise();
    return user.Item;
  }
}
