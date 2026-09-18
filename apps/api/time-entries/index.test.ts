import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { APIEvent, TimeEntry } from '../types';

const db = vi.hoisted(() => ({
  deleteTimeEntry: vi.fn(),
  getActiveTimeEntry: vi.fn(),
  saveTimeEntry: vi.fn(),
}));

vi.mock('./db', () => ({
  addDuration: (timeEntry: TimeEntry) => ({
    ...timeEntry,
    ...(timeEntry.stop && { duration: Math.round((timeEntry.stop - timeEntry.start) / 1000) }),
  }),
  deleteTimeEntry: db.deleteTimeEntry,
  getActiveTimeEntry: db.getActiveTimeEntry,
  getAllTimeEntries: vi.fn(),
  getLatestTags: vi.fn(),
  getNextId: vi.fn(),
  getTimeEntryByTimeId: vi.fn(),
  isTimeEntryConflict: (error: unknown) => error instanceof Error && error.message === 'conflict',
  saveTimeEntry: db.saveTimeEntry,
}));

import { handler } from './index';

const account = { apiKey: 'test-account', admin: false };
const event = { body: '{}', queryStringParameters: {} } as APIEvent;

describe('getting the active time entry', () => {
  it('returns not found when there is no active time entry', async () => {
    db.getActiveTimeEntry.mockResolvedValue(null);

    const response = await handler('GET /api/time/active', account, event);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ error: 'no_active_timer' });
  });
});

describe('stopping a time entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T12:00:00.000Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('discards an entry whose current duration is under ten seconds', async () => {
    const active = {
      account: account.apiKey,
      id: 1,
      start: Date.now() - 9_999,
      tags: [],
    };
    db.getActiveTimeEntry.mockResolvedValue(active);

    const response = await handler('POST /api/time/stop', account, event);

    expect(db.deleteTimeEntry).toHaveBeenCalledWith(active, active);
    expect(db.saveTimeEntry).not.toHaveBeenCalled();
    expect(JSON.parse(response.body)).toEqual({ discarded: true });
  });

  it('saves an entry at the ten-second boundary', async () => {
    const active = {
      account: account.apiKey,
      id: 1,
      start: Date.now() - 10_000,
      tags: ['planning'],
    };
    db.getActiveTimeEntry.mockResolvedValue(active);

    const response = await handler('POST /api/time/stop', account, event);

    expect(db.deleteTimeEntry).not.toHaveBeenCalled();
    expect(db.saveTimeEntry).toHaveBeenCalledWith({ ...active, stop: Date.now() }, active);
    expect(JSON.parse(response.body)).toEqual({
      discarded: false,
      timeEntry: { ...active, stop: Date.now(), duration: 10 },
    });
  });

  it('uses a manually adjusted start when deciding whether to discard', async () => {
    const active = {
      account: account.apiKey,
      id: 1,
      start: Date.now() - 5 * 60_000,
      tags: [],
    };
    db.getActiveTimeEntry.mockResolvedValue(active);

    await handler('POST /api/time/stop', account, event);

    expect(db.saveTimeEntry).toHaveBeenCalledWith({ ...active, stop: Date.now() }, active);
    expect(db.deleteTimeEntry).not.toHaveBeenCalled();
  });

  it('rechecks the current start after a concurrent update', async () => {
    const original = {
      account: account.apiKey,
      id: 1,
      start: Date.now() - 1_000,
      tags: [],
    };
    const adjusted = { ...original, start: Date.now() - 5 * 60_000 };
    db.getActiveTimeEntry.mockResolvedValueOnce(original).mockResolvedValueOnce(adjusted);
    db.deleteTimeEntry.mockRejectedValueOnce(new Error('conflict'));

    const response = await handler('POST /api/time/stop', account, event);

    expect(db.deleteTimeEntry).toHaveBeenCalledWith(original, original);
    expect(db.saveTimeEntry).toHaveBeenCalledWith({ ...adjusted, stop: Date.now() }, adjusted);
    expect(JSON.parse(response.body)).toMatchObject({ discarded: false });
  });
});
