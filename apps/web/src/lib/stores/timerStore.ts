import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isBefore,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  sub,
} from 'date-fns';
import { isSameDay } from 'date-fns';
import { derived, get, type Readable, readable, writable } from 'svelte/store';
import { getActive, getTimeEntries, start, stop } from '$lib/api/TimeApi';
import { ApiError } from '$lib/api/AccountApi';
import type { TimeEntry } from '$lib/types';
import { formatSeconds } from '$lib/timeFormat';

const { subscribe, set } = writable<TimeEntry | null>(null);

async function startTimer() {
  try {
    const active = await start();
    set(active);
  } catch {
    set(null);
  }
}

async function stopTimer() {
  try {
    await stop();
    timeHistory.update();
    set(null);
  } catch {
    console.log('could not stop clock');
  }
}

async function initialize() {
  try {
    const active = await getActive();
    console.log('active clock', active);
    set(active);
  } catch {
    console.log('no active clock');
    set(null);
  }
}

const time = readable(new Date(), function start(set) {
  const interval = setInterval(() => {
    set(new Date());
  }, 1000);

  return function stop() {
    clearInterval(interval);
  };
});

function createTimeHistory() {
  const { subscribe: subscribeStart, set: setStart, update: logsUpdate } = writable<Date | null>(null);
  const { subscribe: subscribeStop, set: setStop } = writable<Date | null>(null);
  const { subscribe } = derived<[Readable<Date | null>, Readable<Date | null>], TimeEntry[]>(
    [{ subscribe: subscribeStart }, { subscribe: subscribeStop }],
    ([start, stop], set) => {
      console.log('search time history', start, stop);
      if (!start || !stop) {
        set([]);
        return;
      }

      getTimeEntries(start, stop)
        .then((entries) => {
          set(entries);
        })
        .catch(() => {
          set([]);
        });
    },
  );

  const total = derived<Readable<TimeEntry[]>, number>({ subscribe }, (timeEntries) => {
    return timeEntries.reduce((total, timeEntry) => total + (timeEntry.duration ?? 0), 0);
  });

  return {
    subscribe,
    setDates(start: Date, stop: Date) {
      setStart(start);
      setStop(stop);
    },
    total,
    update: () => logsUpdate((val) => val),
  };
}

export const elapsed = derived([{ subscribe }, time], (timeEntry) => {
  const [$entry, $time] = timeEntry;
  if (!$entry) {
    return 0;
  }

  return Math.round(($time.getTime() - $entry.start.getTime()) / 1000);
});

export function formatSecs(totalSeconds: number) {
  return formatSeconds(totalSeconds);
}

export function formatSecsNatural(totalSeconds: number) {
  const hours = Math.floor(Math.abs(totalSeconds) / 3600);
  const minutes = Math.floor(Math.abs(totalSeconds) / 60) % 60;

  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export const active = {
  subscribe,
  startTimer,
  stopTimer,
  initialize,
};

function createCurrent() {
  const time = readable(new Date(), function start(set) {
    const interval = setInterval(() => {
      set(new Date());
    }, 1000);

    return function stop() {
      clearInterval(interval);
    };
  });

  const current = writable<TimeEntry | null>(null);
  let revision = 0;
  let refreshPromise: Promise<TimeEntry | null> | null = null;

  function set(value: TimeEntry | null) {
    revision += 1;
    current.set(value);
  }

  function refresh(force = false) {
    if (refreshPromise && !force) return refreshPromise;

    const startingRevision = revision;
    const request = getActive()
      .then((activeTimer) => {
        if (revision === startingRevision) current.set(activeTimer);
        return activeTimer;
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          if (revision === startingRevision) current.set(null);
          return null;
        }
        return get(current);
      })
      .finally(() => {
        if (refreshPromise === request) refreshPromise = null;
      });
    refreshPromise = request;
    return request;
  }

  const elapsed = derived([current, time], (timeEntry) => {
    const [$entry, $time] = timeEntry;
    if (!$entry) {
      return 0;
    }

    return Math.round(($time.getTime() - $entry.start.getTime()) / 1000);
  });

  return {
    subscribe: current.subscribe,
    set,
    refresh,
    elapsed,
  };
}

const createLogs = () => {
  const logs = writable<TimeEntry[]>([]);
  const total = derived<Readable<TimeEntry[]>, number>(logs, (timeEntries) => {
    return timeEntries.reduce((total, timeEntry) => total + (timeEntry.duration ?? 0), 0);
  });

  return {
    subscribe: logs.subscribe,
    set: logs.set,
    total,
  };
};

export const timeHistory = createTimeHistory();

export const logs = createLogs();
export const current = createCurrent();

export type Period = 'day' | 'week' | 'month' | 'year';

export function getDates(amount: number, period: 'day' | 'week' | 'month' | 'year') {
  const now = new Date();
  let start: Date;
  let stop: Date;
  switch (period) {
    case 'day':
      start = startOfDay(sub(now, { days: amount }));
      stop = endOfDay(sub(now, { days: amount }));
      break;
    case 'week':
      start = startOfWeek(sub(now, { weeks: amount }));
      stop = endOfWeek(sub(now, { weeks: amount }));
      break;
    case 'month':
      start = startOfMonth(sub(now, { months: amount }));
      stop = endOfMonth(sub(now, { months: amount }));
      break;
    case 'year':
      start = startOfYear(sub(now, { years: amount }));
      stop = endOfYear(sub(now, { years: amount }));
      break;
    default:
      throw new Error('Not possible');
  }

  return [start, stop];
}

export function formatTime(date: Date, reference?: Date) {
  const diffDays = differenceInCalendarDays(date, reference ?? new Date());
  if (diffDays > 1 && diffDays < 30) {
    return (isBefore(date, reference ?? new Date()) ? '(-' : '(+') + `${diffDays}d) ` + format(date, 'HH:mm:ss');
  }

  if (reference && isSameDay(date, reference)) {
    return format(date, 'HH:mm:ss');
  }

  const sameYear = isSameYear(date, reference || new Date());
  if (sameYear) {
    return format(date, 'MMMM do HH:mm:ss');
  }

  return format(date, 'yyyy MMM do HH:mm:ss');
}
