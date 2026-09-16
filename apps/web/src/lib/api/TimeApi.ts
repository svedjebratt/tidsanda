import { apiDelete, apiGet, apiPost, apiPut, url } from './AccountApi';
import type { TimeEntry } from '$lib/types';

interface JsonTimeEntry {
  account: string;
  id: number;
  start: number;
  stop?: number;
  tags: string[];
}

type JsonStopResult = { discarded: true } | { discarded: false; timeEntry: JsonTimeEntry };

export type StopResult = { discarded: true } | { discarded: false; timeEntry: TimeEntry };

function toTimeEntry(jsonTimeEntry: JsonTimeEntry): TimeEntry {
  return {
    ...jsonTimeEntry,
    start: new Date(jsonTimeEntry.start),
    stop: jsonTimeEntry.stop ? new Date(jsonTimeEntry.stop) : undefined,
  };
}

export function getTags(): Promise<string[]> {
  return apiGet<{ tags: string[] }>(`${url}/time/tags`).then((json) => json.tags);
}

export function getActive() {
  return apiGet<JsonTimeEntry>(`${url}/time/active`).then(toTimeEntry);
}

export function start(tags?: string[]) {
  return apiPost<JsonTimeEntry>(`${url}/time/start`, { tags }).then(toTimeEntry);
}

export function stop(): Promise<StopResult> {
  return apiPost<JsonStopResult>(`${url}/time/stop`, {}).then((result) =>
    result.discarded ? result : { ...result, timeEntry: toTimeEntry(result.timeEntry) },
  );
}

export function getTimeEntries(from: Date, to: Date) {
  return apiGet<JsonTimeEntry[]>(
    `${url}/time?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
  ).then((entries) => entries.map(toTimeEntry));
}

export function getTimeEntry(timeId: number) {
  return apiGet<JsonTimeEntry>(`${url}/time/${timeId}`).then(toTimeEntry);
}

export function updateTimeEntry(timeId: number, timeEntry: TimeEntry) {
  return apiPut<JsonTimeEntry>(`${url}/time/${timeId}`, {
    start: timeEntry.start.getTime(),
    stop: timeEntry.stop ? timeEntry.stop.getTime() : undefined,
    tags: timeEntry.tags,
  }).then(toTimeEntry);
}

export function deleteTimeEntry(timeId: number) {
  return apiDelete<void>(`${url}/time/${timeId}`);
}
