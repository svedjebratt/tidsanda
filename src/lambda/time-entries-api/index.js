const AWS = require('aws-sdk');

const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  let body;
  let statusCode = 200;
  const headers = {
    'Content-Type': 'application/json',
  };

  const account = await getLoggedInUser(event.headers);
  if (!account) {
    statusCode = 401;
    body = { error: 'not_logged_in' };
    return {
      statusCode,
      body: JSON.stringify(body),
      headers,
    };
  }
  // console.log('event', event);

  try {
    switch (event.routeKey) {
      case 'POST /api/time/start': {
        const active = await getActiveTimeEntry(account.apiKey);
        if (active) {
          statusCode = 400;
          body = { error: 'timer_already_started' };
          break;
        }

        const nextId = await getNextId(account.apiKey);

        const requestJSON = event.body ? JSON.parse(event.body) : {};
        const timeEntry = {
          account: account.apiKey,
          id: nextId,
          start: new Date().getTime(),
          tags: requestJSON.tags || [],
        };
        await saveTimeEntry(timeEntry);
        body = timeEntry;
        break;
      }
      case 'POST /api/time/stop': {
        const active = await getActiveTimeEntry(account.apiKey);
        if (!active) {
          statusCode = 400;
          body = { error: 'no_active_timer' };
          break;
        }

        active.stop = new Date().getTime();
        await saveTimeEntry(active);
        body = addDuration(active);
        break;
      }
      case 'GET /api/time/active': {
        const active = await getActiveTimeEntry(account.apiKey);
        if (!active) {
          statusCode = 400;
          body = { error: 'no_active_timer' };
          break;
        }

        body = active;
        break;
      }
      case 'GET /api/time/tags': {
        const tags = await getLatestTags(account.apiKey);
        body = { tags };
        break;
      }
      case 'PUT /api/time/{id}': {
        const id = Number(event.pathParameters.id);
        const timeEntry = await getTimeEntryByTimeId(account.apiKey, id);
        if (!timeEntry?.length) {
          statusCode = 400;
          body = { error: 'invalid_time_id' };
          break;
        }

        const { start, stop, tags } = event.body ? JSON.parse(event.body) : {};

        if ((start && isNaN(start)) || (stop && isNaN(stop)) || (tags && !Array.isArray(tags))) {
          statusCode = 400;
          body = { error: 'invalid_body' };
          break;
        }

        body = {
          ...timeEntry[0],
          ...(start && { start }),
          ...(stop && { stop }),
          ...(tags && { tags }),
        };
        await saveTimeEntry(body);
        break;
      }
      case 'DELETE /api/time/{id}': {
        const id = Number(event.pathParameters.id);
        const timeEntry = await getTimeEntryByTimeId(account.apiKey, id);
        if (!timeEntry?.length) {
          statusCode = 400;
          body = { error: 'invalid_time_id' };
          break;
        }

        await deleteTimeEntry(timeEntry[0]);
        body = {};
        break;
      }
      case 'GET /api/time/{id}': {
        const id = Number(event.pathParameters.id);
        const timeEntry = await getTimeEntryByTimeId(account.apiKey, id);
        if (!timeEntry?.length) {
          statusCode = 400;
          body = { error: 'invalid_time_id' };
          break;
        }
        body = timeEntry[0];
        break;
      }
      case 'GET /api/time':
        const { from, to } = event.queryStringParameters;
        if (!from || !to) {
          statusCode = 400;
          body = { error: 'invalid_date_range' };
          break;
        }
        body = await getAllTimeEntries(account.apiKey, new Date(from), new Date(to));
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

function addDuration(timeEntry) {
  return {
    ...timeEntry,
    ...(timeEntry.stop && { duration: Math.round((timeEntry.stop - timeEntry.start) / 1000) }),
  };
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

async function getNextId(account) {
  const lastEntry = await runQuery((LastEvaluatedKey) =>
    dynamo
      .query({
        TableName: 'time-entries',
        KeyConditionExpression: 'account = :account',
        ScanIndexForward: false,
        Limit: 1,
        ExpressionAttributeValues: {
          ':account': account,
        },
        ...(LastEvaluatedKey && { ExclusiveStartKey: LastEvaluatedKey }),
      })
      .promise()
  );

  if (lastEntry?.length) {
    return lastEntry[0].id + 1;
  }
  return 1;
}

async function saveTimeEntry(timeEntry) {
  return dynamo
    .put({
      TableName: 'time-entries',
      Item: timeEntry,
    })
    .promise();
}

async function deleteTimeEntry(timeEntry) {
  return dynamo
    .delete({
      TableName: 'time-entries',
      Key: {
        account: timeEntry.account,
        id: timeEntry.id,
      },
    })
    .promise();
}

async function getTimeEntryByTimeId(account, id) {
  return runQuery((LastEvaluatedKey) =>
    dynamo
      .query({
        TableName: 'time-entries',
        KeyConditionExpression: 'account = :account AND id = :id',
        ExpressionAttributeValues: {
          ':account': account,
          ':id': id,
        },
        ...(LastEvaluatedKey && { ExclusiveStartKey: LastEvaluatedKey }),
      })
      .promise()
  );
}

async function getActiveTimeEntry(account) {
  return runQuery((LastEvaluatedKey) =>
    dynamo
      .query({
        TableName: 'time-entries',
        KeyConditionExpression: 'account = :account',
        ScanIndexForward: false,
        FilterExpression: 'attribute_not_exists(stop)',
        ExpressionAttributeValues: {
          ':account': account,
        },
        Limit: 1,
        ...(LastEvaluatedKey && { ExclusiveStartKey: LastEvaluatedKey }),
      })
      .promise()
  ).then((result) => (result?.length ? result[0] : null));
}

async function getAllTimeEntries(account, from, to) {
  return runQuery((LastEvaluatedKey) =>
    dynamo
      .query({
        TableName: 'time-entries',
        KeyConditionExpression: 'account = :account',
        FilterExpression: '#startTimeName < :stopTime AND #startTimeName > :startTime AND attribute_exists(stop)',
        ExpressionAttributeNames: {
          '#startTimeName': 'start',
        },
        ExpressionAttributeValues: {
          ':account': account,
          ':startTime': from.getTime(),
          ':stopTime': to.getTime(),
        },
        ...(LastEvaluatedKey && { ExclusiveStartKey: LastEvaluatedKey }),
      })
      .promise()
  );
}

async function getLatestTags(account) {
  const entries = await runQuery((LastEvaluatedKey) =>
    dynamo
      .query({
        TableName: 'time-entries',
        KeyConditionExpression: 'account = :account',
        FilterExpression: '#startTimeName > :startTime',
        ExpressionAttributeNames: {
          '#startTimeName': 'start',
        },
        ExpressionAttributeValues: {
          ':account': account,
          ':startTime': new Date().getTime() - 30 * 24 * 3600 * 1000,
        },
        ...(LastEvaluatedKey && { ExclusiveStartKey: LastEvaluatedKey }),
      })
      .promise()
  );

  const latestTags = entries
    .map((e) => e.tags)
    .reduce((allTags, tags) => {
      tags.forEach((tag) => allTags.add(tag));
      return allTags;
    }, new Set());

  return Array.from(latestTags);
}

function runQuery(action, lastEvaluatedKey, count = 0) {
  return action(lastEvaluatedKey)
    .then(async (result) => {
      // if (result.LastEvaluatedKey && count < 10) {
      //   return [...result.Items, await runQuery(action, result.LastEvaluatedKey, count + 1)];
      // }
      return result.Items;
    })
    .then((timeEntries) => timeEntries.map(addDuration));
}
