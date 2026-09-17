export type PomodoroPhase = 'focus' | 'break';
export type PomodoroStatus = 'waiting' | 'running' | 'paused' | 'overtime';

export interface PomodoroState {
  version: 1;
  phase: PomodoroPhase;
  status: PomodoroStatus;
  remainingMs: number;
  endsAt: number | null;
  updatedAt: number;
}

export interface PomodoroUpdate {
  state: PomodoroState;
  completedPhase: PomodoroPhase | null;
  completedAt: number | null;
}

export const pomodoroDurations: Record<PomodoroPhase, number> = {
  focus: 25 * 60_000,
  break: 5 * 60_000,
};

export function isFocusOvertime(state: PomodoroState) {
  return state.status === 'overtime';
}

export function createInitialPomodoroState(now = Date.now()): PomodoroState {
  return {
    version: 1,
    phase: 'focus',
    status: 'waiting',
    remainingMs: pomodoroDurations.focus,
    endsAt: null,
    updatedAt: now,
  };
}

function isState(value: unknown): value is PomodoroState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<PomodoroState>;
  return (
    state.version === 1 &&
    (state.phase === 'focus' || state.phase === 'break') &&
    (state.status === 'waiting' ||
      state.status === 'running' ||
      state.status === 'paused' ||
      state.status === 'overtime') &&
    typeof state.remainingMs === 'number' &&
    Number.isFinite(state.remainingMs) &&
    (state.remainingMs >= 0 || state.status === 'overtime') &&
    state.remainingMs <= pomodoroDurations[state.phase] &&
    (state.status !== 'overtime' || (state.phase === 'focus' && state.remainingMs <= 0)) &&
    (state.endsAt === null || (typeof state.endsAt === 'number' && Number.isFinite(state.endsAt))) &&
    (state.status === 'running' || state.status === 'overtime' ? state.endsAt !== null : state.endsAt === null) &&
    typeof state.updatedAt === 'number' &&
    Number.isFinite(state.updatedAt)
  );
}

export function createPomodoroTimer(account: string, storage: Storage, now: () => number = Date.now) {
  const storageKey = `tidsanda:pomodoro:${account}`;
  const notificationKey = `${storageKey}:notification`;

  function save(state: PomodoroState) {
    storage.setItem(storageKey, JSON.stringify(state));
    return state;
  }

  function load(): PomodoroState {
    const stored = storage.getItem(storageKey);
    if (!stored) return save(createInitialPomodoroState(now()));

    try {
      const parsed: unknown = JSON.parse(stored);
      return isState(parsed) ? parsed : save(createInitialPomodoroState(now()));
    } catch {
      return save(createInitialPomodoroState(now()));
    }
  }

  function update(): PomodoroUpdate {
    const current = load();
    const currentTime = now();
    if ((current.status !== 'running' && current.status !== 'overtime') || current.endsAt === null) {
      return { state: current, completedPhase: null, completedAt: null };
    }

    const remainingMs = current.endsAt - currentTime;
    if (remainingMs > 0) {
      return { state: { ...current, remainingMs }, completedPhase: null, completedAt: null };
    }

    if (current.phase === 'focus') {
      const state: PomodoroState = { ...current, status: 'overtime', remainingMs };
      const justCompleted = current.status === 'running';
      return {
        state: justCompleted ? save(state) : state,
        completedPhase: justCompleted ? 'focus' : null,
        completedAt: justCompleted ? current.endsAt : null,
      };
    }

    return {
      state: save({
        version: 1,
        phase: 'focus',
        status: 'waiting',
        remainingMs: pomodoroDurations.focus,
        endsAt: null,
        updatedAt: current.endsAt,
      }),
      completedPhase: 'break',
      completedAt: current.endsAt,
    };
  }

  function advance(): PomodoroUpdate {
    const normalized = update();
    const currentTime = now();
    let state: PomodoroState;

    if (isFocusOvertime(normalized.state)) {
      state = {
        version: 1,
        phase: 'break',
        status: 'waiting',
        remainingMs: pomodoroDurations.break,
        endsAt: null,
        updatedAt: currentTime,
      };
    } else if (normalized.state.status === 'running') {
      state = {
        ...normalized.state,
        status: 'paused',
        remainingMs: Math.max(0, (normalized.state.endsAt ?? currentTime) - currentTime),
        endsAt: null,
        updatedAt: currentTime,
      };
    } else {
      state = {
        ...normalized.state,
        status: 'running',
        endsAt: currentTime + normalized.state.remainingMs,
        updatedAt: currentTime,
      };
    }

    return { ...normalized, state: save(state) };
  }

  function reset() {
    return save(createInitialPomodoroState(now()));
  }

  function claimNotification(phase: PomodoroPhase, completedAt: number) {
    const transition = `${phase}:${completedAt}`;
    if (storage.getItem(notificationKey) === transition) return false;
    storage.setItem(notificationKey, transition);
    return true;
  }

  return {
    storageKey,
    read: () => update().state,
    update,
    advance,
    reset,
    claimNotification,
  };
}
