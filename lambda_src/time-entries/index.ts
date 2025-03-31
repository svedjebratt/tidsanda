import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Account, TimeEntry, APIEvent, APIResponse } from '../types';
import {
  addDuration,
  deleteTimeEntry,
  getAllTimeEntries,
  getLatestTags,
  getNextId,
  getTimeEntryByTimeId,
  saveTimeEntry,
} from './db';
import { getActiveTimeEntry } from './db';
import { parseRoute } from '../parseRoute';

const dynamo = new DynamoDBClient();

export const handler = async (route: string, account: Account | null, event: APIEvent): Promise<APIResponse> => {
  let body: any;
  let statusCode = 200;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (!account) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'not_logged_in' }),
      headers,
    };
  }

  const routeParser = parseRoute(route);

  try {
    if (routeParser.parse(/^POST \/api\/time\/start$/)) {
      const active = await getActiveTimeEntry(account.apiKey);
      if (active) {
        statusCode = 400;
        body = { error: 'timer_already_started' };
      } else {
        const nextId = await getNextId(account.apiKey);
        console.log('nextId', nextId);
        const requestJSON = event.body ? JSON.parse(event.body) : {};
        console.log('requestJSON', requestJSON);
        const timeEntry = {
          account: account.apiKey,
          id: nextId,
          start: new Date().getTime(),
          tags: requestJSON.tags || [],
        };
        await saveTimeEntry(timeEntry);
        body = timeEntry;
      }
    } else if (routeParser.parse(/^POST \/api\/time\/stop$/)) {
      const active = await getActiveTimeEntry(account.apiKey);
      if (!active) {
        statusCode = 400;
        body = { error: 'no_active_timer' };
      } else {
        active.stop = new Date().getTime();
        await saveTimeEntry(active);
        body = addDuration(active);
      }
    } else if (routeParser.parse(/^GET \/api\/time\/active$/)) {
      const active = await getActiveTimeEntry(account.apiKey);
      if (!active) {
        statusCode = 400;
        body = { error: 'no_active_timer' };
      } else {
        body = active;
      }
    } else if (routeParser.parse(/^GET \/api\/time\/tags$/)) {
      const tags = await getLatestTags(account.apiKey);
      body = { tags };
    } else if (routeParser.parse(/^PUT \/api\/time\/(\d+)$/)) {
      const id = Number(routeParser.getGroups()[0]);
      const timeEntry = await getTimeEntryByTimeId(account.apiKey, id);
      if (!timeEntry?.length) {
        statusCode = 400;
        body = { error: 'invalid_time_id' };
      } else {
        const { start, stop, tags } = event.body ? JSON.parse(event.body) : {};

        if ((start && isNaN(start)) || (stop && isNaN(stop)) || (tags && !Array.isArray(tags))) {
          statusCode = 400;
          body = { error: 'invalid_body' };
        } else {
          body = {
            ...timeEntry[0],
            ...(start && { start }),
            ...(stop && { stop }),
            ...(tags && { tags }),
          };
          await saveTimeEntry(body);
        }
      }
    } else if (routeParser.parse(/^DELETE \/api\/time\/(\d+)$/)) {
      const id = Number(routeParser.getGroups()[0]);
      const timeEntry = await getTimeEntryByTimeId(account.apiKey, id);
      if (!timeEntry?.length) {
        statusCode = 400;
        body = { error: 'invalid_time_id' };
      } else {
        await deleteTimeEntry(timeEntry[0]);
        body = {};
      }
    } else if (routeParser.parse(/^GET \/api\/time\/(\d+)$/)) {
      const id = Number(routeParser.getGroups()[0]);
      const timeEntry = await getTimeEntryByTimeId(account.apiKey, id);
      if (!timeEntry?.length) {
        statusCode = 400;
        body = { error: 'invalid_time_id' };
      } else {
        body = timeEntry[0];
      }
    } else if (routeParser.parse(/^GET \/api\/time$/)) {
      const { from, to } = event.queryStringParameters || {};
      if (!from || !to) {
        statusCode = 400;
        body = { error: 'invalid_date_range' };
      } else {
        body = await getAllTimeEntries(account.apiKey, new Date(from), new Date(to));
      }
    } else {
      throw new Error(`Unsupported route: "${route}"`);
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
