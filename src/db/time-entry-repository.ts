import { TimeEntry } from '../types';
import { client } from './connection';

type DbTimeEntry = Omit<TimeEntry, 'id' | 'timeId'> & {id: number, time_id: number};

function toTimeEntry(dbTimeEntry: DbTimeEntry): TimeEntry {
    const { time_id, ...rest } = dbTimeEntry;
    return {
        ...rest,
        timeId: time_id,
        ...(rest.stop && { duration: Math.round((rest.stop.getTime() - rest.start.getTime()) / 1000) })
    };
}

export async function saveTimeEntry(timeEntry: TimeEntry): Promise<TimeEntry> {
    let query;
    let params;
    if (timeEntry.id) {
        query = 'UPDATE time_entry SET start=$2, stop=$3, tags=$4, time_id=$5 WHERE id=$1 RETURNING *';
        params = [timeEntry.id, timeEntry.start, timeEntry.stop || null, `[${timeEntry.tags.map(tag => `"${tag}"`).join(',')}]` || '[]', timeEntry.timeId];
    } else {
        query = 'INSERT INTO time_entry (account, time_id, start, stop, tags) VALUES ($1, coalesce((select max(time_id)+1 FROM time_entry WHERE account=$5 AND NOT time_id IS NULL), 1), $2, $3, $4) RETURNING *';
        params = [timeEntry.account, timeEntry.start, timeEntry.stop || null, `[${timeEntry.tags.map(tag => `"${tag}"`).join(',')}]` || '[]', timeEntry.account];
    }

    const res = await (await client).query<DbTimeEntry>(query, params);
    if (res.rows.length) {
        return res.rows.map(toTimeEntry)[0];
    }
    throw new Error('Could not save time entry');
}

export async function getActive(account: string): Promise<TimeEntry | null> {
    const query = 'SELECT * FROM time_entry WHERE account=$1 AND stop IS NULL';
    const res = await (await client).query<DbTimeEntry, [string]>(query, [account]);
    if (res.rows.length === 1) {
        return res.rows.map(toTimeEntry)[0];
    }
    return null;

    // return client
    //     .then(client => client.query<DbTimeEntry, [string]>(query, [account]))
    //     .then(res => res.rows.length === 1 ? toTimeEntry(res.rows[0]) : null);
}

export async function getByTimeId(account: string, timeId: number): Promise<TimeEntry | null> {
    const query = 'SELECT * FROM time_entry WHERE account=$1 AND time_id=$2';
    const res = await (await client).query<DbTimeEntry, [string, number]>(query, [account, timeId]);

    if (res.rows.length === 1) {
        return res.rows.map(toTimeEntry)[0];
    }
    return null;
}

export async function getAll(account: string, from: Date, to: Date): Promise<TimeEntry[]> {
    const query = `SELECT *
                   FROM time_entry
                   WHERE account = $1
                     AND start between $2 and $3
                     AND stop IS NOT NuLL`;
    // const query = `SELECT * FROM time_entry WHERE account=$1 AND start>=TO_TIMESTAMP(${from.getTime() / 1000}) and start<=TO_TIMESTAMP(${to.getTime() / 1000})`;
    const res = await (await client).query<DbTimeEntry, [string, Date, Date]>(query, [account, from, to]);

    return res.rows.map(toTimeEntry);
}

export async function getTags(account: string): Promise<string[]> {
    const query = 'SELECT DISTINCT tag FROM (SELECT id, jsonb_array_elements(tags) AS tag FROM time_entry WHERE account=$1) AS tags';
    const res = await (await client).query<{tag: string}, [string]>(query, [account]);
    if (res.rows.length) {
        return res.rows.map(tag => tag.tag);
    }
    return [];
}
