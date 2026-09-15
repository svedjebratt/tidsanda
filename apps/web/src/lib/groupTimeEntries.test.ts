import { describe, expect, it } from 'vite-plus/test';
import { groupTimeEntries } from './groupTimeEntries';
import type { TimeEntry } from './types';

function timeEntry(id: number, start: string, stop: string, tags: string[]): TimeEntry {
  return {
    account: 'test-account',
    id,
    start: new Date(start),
    stop: new Date(stop),
    tags,
  };
}

describe('groupTimeEntries', () => {
  it('groups exact tag sets independent of order and sorts groups and entries by latest activity', () => {
    const entries = [
      timeEntry(1, '2026-09-15T08:00:00Z', '2026-09-15T08:30:00Z', ['planning', 'client-a']),
      timeEntry(2, '2026-09-15T10:00:00Z', '2026-09-15T10:30:00Z', ['client-a', 'planning']),
      timeEntry(3, '2026-09-15T09:00:00Z', '2026-09-15T09:30:00Z', ['client-b']),
      timeEntry(4, '2026-09-15T11:00:00Z', '2026-09-15T11:30:00Z', []),
      timeEntry(5, '2026-09-15T07:00:00Z', '2026-09-15T07:30:00Z', []),
    ];

    expect(groupTimeEntries(entries)).toEqual([
      { tags: [], entries: [entries[3], entries[4]] },
      { tags: ['client-a', 'planning'], entries: [entries[1], entries[0]] },
      { tags: ['client-b'], entries: [entries[2]] },
    ]);
  });
});
