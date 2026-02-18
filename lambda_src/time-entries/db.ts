import {
  AttributeValue,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  QueryOutput,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { PomodoroState, TimeEntry } from '../types';

const dynamo = new DynamoDBClient();

export function addDuration(timeEntry: TimeEntry) {
  return {
    ...timeEntry,
    ...(timeEntry.stop && { duration: Math.round((timeEntry.stop - timeEntry.start) / 1000) }),
  };
}

export async function getNextId(account: string) {
  const lastEntry = await runQuery((LastEvaluatedKey) => {
    const a = dynamo.send(
      new QueryCommand({
        TableName: 'time-entries',
        KeyConditionExpression: 'account = :account',
        ScanIndexForward: false,
        Limit: 1,
        ExpressionAttributeValues: {
          ':account': { S: account },
        },
        ...(LastEvaluatedKey && { ExclusiveStartKey: { id: LastEvaluatedKey } }),
      })
    );
    return a;
  });

  if (lastEntry?.length) {
    return lastEntry[0].id + 1;
  }
  return 1;
}

export async function saveTimeEntry(timeEntry: TimeEntry) {
  console.log('saveTimeEntry', timeEntry);
  const putItemCmd = new PutItemCommand({
    TableName: 'time-entries',
    Item: {
      account: { S: timeEntry.account },
      id: { N: timeEntry.id.toString() },
      start: { N: timeEntry.start.toString() },
      tags: { L: timeEntry.tags.map((tag) => ({ S: tag })) },
      ...(timeEntry.duration && { duration: { N: timeEntry.duration.toString() } }),
      ...(timeEntry.stop && { stop: { N: timeEntry.stop.toString() } }),
    },
  });
  return dynamo.send(putItemCmd);
}

export async function deleteTimeEntry(timeEntry: TimeEntry) {
  return dynamo.send(
    new DeleteItemCommand({
      TableName: 'time-entries',
      Key: {
        account: { S: timeEntry.account },
        id: { N: timeEntry.id.toString() },
      },
    })
  );
}

export async function getTimeEntryByTimeId(account: string, id: number) {
  return runQuery((LastEvaluatedKey) =>
    dynamo.send(
      new QueryCommand({
        TableName: 'time-entries',
        KeyConditionExpression: 'account = :account AND id = :id',
        ExpressionAttributeValues: {
          ':account': { S: account },
          ':id': { N: id.toString() },
        },
        ...(LastEvaluatedKey && { ExclusiveStartKey: { id: LastEvaluatedKey } }),
      })
    )
  );
}

export async function getActiveTimeEntry(account: string) {
  return runQuery((LastEvaluatedKey) =>
    dynamo.send(
      new QueryCommand({
        TableName: 'time-entries',
        KeyConditionExpression: 'account = :account',
        ScanIndexForward: false,
        FilterExpression: 'attribute_not_exists(stop)',
        ExpressionAttributeValues: {
          ':account': { S: account },
        },
        Limit: 1,
        ...(LastEvaluatedKey && { ExclusiveStartKey: { id: LastEvaluatedKey } }),
      })
    )
  ).then((result) => (result?.length ? result[0] : null));
}

export async function getAllTimeEntries(account: string, from: Date, to: Date) {
  return runQuery((LastEvaluatedKey) =>
    dynamo.send(
      new QueryCommand({
        TableName: 'time-entries',
        KeyConditionExpression: 'account = :account',
        FilterExpression: '#startTimeName < :stopTime AND #startTimeName > :startTime AND attribute_exists(stop)',
        ExpressionAttributeNames: {
          '#startTimeName': 'start',
        },
        ExpressionAttributeValues: {
          ':account': { S: account },
          ':startTime': { N: from.getTime().toString() },
          ':stopTime': { N: to.getTime().toString() },
        },
        ...(LastEvaluatedKey && { ExclusiveStartKey: { id: LastEvaluatedKey } }),
      })
    )
  );
}

export async function getLatestTags(account: string) {
  const entries = await runQuery((LastEvaluatedKey) =>
    dynamo.send(
      new QueryCommand({
        TableName: 'time-entries',
        KeyConditionExpression: 'account = :account',
        FilterExpression: '#startTimeName > :startTime',
        ExpressionAttributeNames: {
          '#startTimeName': 'start',
        },
        ExpressionAttributeValues: {
          ':account': { S: account },
          ':startTime': { N: (new Date().getTime() - 30 * 24 * 3600 * 1000).toString() },
        },
        ...(LastEvaluatedKey && { ExclusiveStartKey: { id: LastEvaluatedKey } }),
      })
    )
  );

  const latestTags = entries
    .map((e) => e.tags)
    .reduce((allTags, tags) => {
      tags.forEach((tag) => allTags.add(tag));
      return allTags;
    }, new Set<string>());

  return Array.from(latestTags);
}

export async function getPomodoroState(account: string): Promise<PomodoroState | null> {
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: 'accounts',
      Key: {
        apiKey: { S: account },
      },
      ProjectionExpression: 'pomodoro',
    })
  );

  const pomodoro = result.Item?.pomodoro?.M;
  if (!pomodoro?.status?.S || !pomodoro?.startedAt?.N || !pomodoro?.durationMs?.N || !pomodoro?.endsAt?.N) {
    return null;
  }

  return {
    status: 'running',
    startedAt: Number(pomodoro.startedAt.N),
    durationMs: Number(pomodoro.durationMs.N),
    endsAt: Number(pomodoro.endsAt.N),
    updatedAt: Number(pomodoro.updatedAt?.N || pomodoro.startedAt.N),
  };
}

export async function savePomodoroState(account: string, state: PomodoroState) {
  return dynamo.send(
    new UpdateItemCommand({
      TableName: 'accounts',
      Key: {
        apiKey: { S: account },
      },
      UpdateExpression: 'SET pomodoro = :pomodoro',
      ExpressionAttributeValues: {
        ':pomodoro': {
          M: {
            status: { S: state.status },
            startedAt: { N: state.startedAt.toString() },
            durationMs: { N: state.durationMs.toString() },
            endsAt: { N: state.endsAt.toString() },
            updatedAt: { N: state.updatedAt.toString() },
          },
        },
      },
    })
  );
}

export async function clearPomodoroState(account: string) {
  return dynamo.send(
    new UpdateItemCommand({
      TableName: 'accounts',
      Key: {
        apiKey: { S: account },
      },
      UpdateExpression: 'REMOVE pomodoro',
    })
  );
}

export async function runQuery(
  action: (lastEvaluatedKey?: AttributeValue) => Promise<QueryOutput>,
  lastEvaluatedKey?: AttributeValue,
  count = 0
) {
  return action(lastEvaluatedKey)
    .then(async (result) => {
      // if (result.LastEvaluatedKey && count < 10) {
      //   return [...result.Items, await runQuery(action, result.LastEvaluatedKey, count + 1)];
      // }
      return (result.Items ?? []).map(
        (item) =>
          ({
            account: item.account.S,
            id: parseInt(item.id.N!!),
            start: parseInt(item.start.N!!),
            ...(item.stop && { stop: parseInt(item.stop.N!!) }),
            tags: item.tags.L!!.map((tag) => tag.S),
            duration: item.duration?.N ? parseInt(item.duration.N) : undefined,
          } as TimeEntry)
      );
    })
    .then((timeEntries) => timeEntries.map(addDuration));
}
