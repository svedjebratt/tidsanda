import { writable } from 'svelte/store';
import { createInitialPomodoroState, createPomodoroTimer, type PomodoroUpdate } from '$lib/pomodoro';

const state = writable(createInitialPomodoroState(0));
let timer: ReturnType<typeof createPomodoroTimer> | null = null;
let completionHandler: ((update: PomodoroUpdate) => void) | null = null;

function apply(update: PomodoroUpdate) {
  state.set(update.state);
  if (update.completedPhase) completionHandler?.(update);
  return update;
}

export const pomodoro = {
  subscribe: state.subscribe,
  initialize(account: string, storage: Storage) {
    timer = createPomodoroTimer(account, storage);
    state.set(timer.read());
  },
  clear() {
    timer = null;
    state.set(createInitialPomodoroState(0));
  },
  update() {
    return timer ? apply(timer.update()) : null;
  },
  advance() {
    return timer ? apply(timer.advance()) : null;
  },
  reset() {
    if (!timer) return;
    state.set(timer.reset());
  },
  sync(storageKey: string | null) {
    if (timer?.storageKey === storageKey) apply(timer.update());
  },
  onCompletion(handler: (update: PomodoroUpdate) => void) {
    completionHandler = handler;
    return () => {
      if (completionHandler === handler) completionHandler = null;
    };
  },
  claimNotification(update: PomodoroUpdate) {
    return (
      update.completedPhase !== null &&
      update.completedAt !== null &&
      timer?.claimNotification(update.completedPhase, update.completedAt) === true
    );
  },
};
