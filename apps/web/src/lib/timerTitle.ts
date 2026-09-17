import type { PomodoroState } from './pomodoro';
import { isFocusOvertime, pomodoroDurations } from './pomodoro';
import { formatMilliseconds, formatSeconds } from './timeFormat';

function isFreshPomodoro(state: PomodoroState) {
  return (
    state.phase === 'focus' &&
    state.status === 'waiting' &&
    state.remainingMs === pomodoroDurations.focus &&
    state.endsAt === null
  );
}

export function getTimerTitle(state: PomodoroState, regularTimerRunning: boolean, elapsedSeconds: number) {
  if (!isFreshPomodoro(state)) {
    const phase = state.phase === 'focus' ? 'Focus' : 'Break';
    const status = isFocusOvertime(state)
      ? 'Overtime'
      : state.status === 'waiting'
        ? 'Ready'
        : state.status === 'running'
          ? 'Running'
          : 'Paused';
    return `${formatMilliseconds(state.remainingMs)} · ${phase} · ${status}`;
  }

  if (regularTimerRunning) {
    return `${formatSeconds(elapsedSeconds)} · Timer · Running`;
  }

  return 'Tidsanda';
}
